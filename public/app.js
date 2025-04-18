// Wait for DOM content to load
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadFiles();
});

document
  .getElementById("setCoordBtn")
  .addEventListener("click", updateFromCoords);

let currentPath = "";
let map, marker;

async function loadFiles(path = "") {
  currentPath = path;
  updateBreadcrumb(path);
  const container = document.getElementById("fileList");
  container.innerHTML = "<p>Loading files...</p>";

  try {
    const res = await fetch(`/files?path=${encodeURIComponent(path)}`);
    const { entries } = await res.json();
    container.innerHTML = "";

    if (path) {
      container.appendChild(
        createFileItem(".. (up)", true, () => {
          const parent = path.split("/").slice(0, -1).join("/");
          loadFiles(parent);
        })
      );
    }

    entries.forEach(({ name, isDirectory }) => {
      const fullPath = `${path}/${name}`.replace(/^\/+/g, "");
      const handler = isDirectory
        ? () => loadFiles(fullPath)
        : () => loadExifData(fullPath);
      container.appendChild(createFileItem(name, isDirectory, handler));
    });
  } catch (err) {
    console.error("Error loading files:", err);
    container.innerHTML = "<p>Error loading files.</p>";
  }
}

function createFileItem(name, isDir, onClick) {
  const item = document.createElement("div");
  item.className = `file-item${isDir ? " folder" : ""}`;
  item.textContent = name;
  item.addEventListener("click", onClick);
  return item;
}

function updateBreadcrumb(path) {
  const container = document.getElementById("breadcrumb");
  container.innerHTML = "";

  const root = createBreadcrumbLink("📁 Root", "", loadFiles);
  container.appendChild(root);

  let accumulated = "";
  path
    .split("/")
    .filter(Boolean)
    .forEach((part) => {
      container.appendChild(document.createTextNode(" / "));
      accumulated += `/${part}`;
      const link = createBreadcrumbLink(part, accumulated, loadFiles);
      container.appendChild(link);
    });
}

function createBreadcrumbLink(text, path, handler) {
  const span = document.createElement("span");
  span.textContent = text;
  span.style.cursor = "pointer";
  span.addEventListener("click", () => handler(path.replace(/^\/+/g, "")));
  return span;
}

async function loadExifData(fileName) {
  const container = document.getElementById("exifData");
  container.innerHTML = "<p>Loading EXIF data...</p>";

  const img = new Image();
  img.src = `/${fileName}`;
  img.onload = () => displayImageWithExif(img, fileName);
  img.onerror = () => {
    container.innerHTML = "<p>Error loading image for EXIF data.</p>";
  };
}

function displayImageWithExif(img, fileName) {
  const preview = document.getElementById("imagePreview");
  preview.innerHTML = "";
  img.style.maxWidth = "200px";
  img.style.cursor = "pointer";
  preview.appendChild(img);

  img.addEventListener("click", () => showModal(img));

  EXIF.getData(img, function () {
    const exif = EXIF.getAllTags(this);
    const container = document.getElementById("exifData");
    container.innerHTML = `<h3>EXIF Data for ${fileName}</h3>`;

    const list = document.createElement("ul");
    Object.entries(exif).forEach(([tag, value]) => {
      const li = document.createElement("li");
      const label = document.createElement("label");
      label.textContent = `${tag}: `;
      const input = document.createElement("input");
      input.type = "text";
      input.value = value;
      input.dataset.tag = tag;
      li.append(label, input);
      list.appendChild(li);
    });

    container.appendChild(list);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save Changes";
    saveBtn.addEventListener("click", () => saveExifData(fileName, list));
    container.appendChild(saveBtn);

    if (exif.GPSLatitude && exif.GPSLongitude) {
      const lat = convertDMSToDD(exif.GPSLatitude, exif.GPSLatitudeRef);
      const lon = convertDMSToDD(exif.GPSLongitude, exif.GPSLongitudeRef);
      if (lat !== null && lon !== null) {
        marker.setLatLng([lat, lon]);
        map.setView([lat, lon], 14);
        document.getElementById("coordInput").value = `${lat.toFixed(
          6
        )}, ${lon.toFixed(6)}`;
      }
    }
  });
}

function applyOrientation(img, orientation) {
  const transforms = {
    2: "scaleX(-1)",
    3: "rotate(180deg)",
    4: "scaleY(-1)",
    5: "rotate(90deg) scaleY(-1)",
    6: "rotate(90deg)",
    7: "rotate(-90deg) scaleY(-1)",
    8: "rotate(-90deg)",
  };
  img.style.transform = transforms[orientation] || "none";
}

function convertDMSToDD(dms, ref) {
  if (!dms || !Array.isArray(dms)) return null;
  const [deg, min, sec] = dms.map(parseFloat);
  let dd = deg + min / 60 + sec / 3600;
  return ["S", "W"].includes(ref) ? -dd : dd;
}

function updateFromCoords() {
  const input = document.getElementById("coordInput").value;
  const [lat, lon] = input.split(",").map((n) => parseFloat(n.trim()));
  if (!isNaN(lat) && !isNaN(lon)) {
    marker.setLatLng([lat, lon]);
    map.setView([lat, lon], 14);
  }
}

async function saveExifData(fileName, exifList) {
  const exifData = {};
  Array.from(exifList.querySelectorAll("input")).forEach((input) => {
    exifData[input.dataset.tag] = input.value;
  });

  try {
    console.log(exifData);
    const res = await fetch("/update-exif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, exifData }),
    });
    alert(
      res.ok ? "EXIF data updated successfully." : "Error updating EXIF data."
    );
  } catch (err) {
    console.error("Error saving EXIF data:", err);
    alert("Error saving EXIF data.");
  }
}

function initMap() {
  map = L.map("map").setView([0, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  marker = L.marker([0, 0], { draggable: true }).addTo(map);

  marker.on("dragend", updateCoordsFromMarker);
  map.on("click", (e) => {
    marker.setLatLng(e.latlng);
    updateCoordsFromMarker();
  });
}

function updateCoordsFromMarker() {
  const { lat, lng } = marker.getLatLng();
  document.getElementById("coordInput").value = `${lat.toFixed(
    6
  )}, ${lng.toFixed(6)}`;
  updateExifInputsFromCoords(lat, lng);
}

function updateExifInputsFromCoords(lat, lon) {
  const latDMS = convertDDToDMS(lat, true);
  const lonDMS = convertDDToDMS(lon, false);

  const tags = [
    ["GPSLatitude", latDMS.dms],
    ["GPSLatitudeRef", latDMS.ref],
    ["GPSLongitude", lonDMS.dms],
    ["GPSLongitudeRef", lonDMS.ref],
  ];

  tags.forEach(([tag, val]) => {
    const input = document.querySelector(`input[data-tag="${tag}"]`);
    if (input) input.value = val;
  });
}

function convertDDToDMS(dd, isLat) {
  const abs = Math.abs(dd);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(4);
  let ref;
  if (isLat) {
    ref = dd >= 0 ? "N" : "S";
  } else {
    ref = dd >= 0 ? "E" : "W";
  }
  return { dms: `${deg} deg ${min}' ${sec}"`, ref };
}

function showModal(img) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  modalImg.src = img.src;
  const orientation = EXIF.getTag(img, "Orientation");
  applyOrientation(modalImg, orientation);
  modal.style.display = "flex";
}

// Close modal listeners
document.querySelector("#imageModal .close").addEventListener("click", () => {
  document.getElementById("imageModal").style.display = "none";
});

document.getElementById("imageModal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = "none";
});

// DROPDOWN LOCATION SEARCH
const searchInput = document.getElementById("locationSearch");
const dropdown = document.getElementById("dropdown");

let debounceTimeout;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimeout);
  const query = searchInput.value.trim();

  if (!query) {
    dropdown.classList.add("hidden");
    return;
  }

  debounceTimeout = setTimeout(() => {
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
        query
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        dropdown.innerHTML = "";
        if (!data.length) {
          dropdown.classList.add("hidden");
          return;
        }

        data.forEach((item) => {
          const option = document.createElement("div");
          option.textContent = item.display_name;
          option.addEventListener("click", () => {
            const latNum = parseFloat(item.lat);
            const lonNum = parseFloat(item.lon);
            marker.setLatLng([latNum, lonNum]);
            map.setView([latNum, lonNum], 14);
            document.getElementById(
              "coordInput"
            ).value = `${latNum}, ${lonNum}`;
            updateExifInputsFromCoords(latNum, lonNum);
            searchInput.value = item.display_name;
            dropdown.classList.add("hidden");
          });
          dropdown.appendChild(option);
        });

        const rect = searchInput.getBoundingClientRect();
        dropdown.style.top = `${
          searchInput.offsetTop + searchInput.offsetHeight
        }px`;
        dropdown.style.left = `${searchInput.offsetLeft}px`;
        dropdown.style.width = `${searchInput.offsetWidth}px`;

        dropdown.classList.remove("hidden");
      })
      .catch((err) => {
        console.error("Autocomplete error:", err);
        dropdown.classList.add("hidden");
      });
  }, 300); // debounce delay
});

// Hide dropdown on outside click
document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target) && e.target !== searchInput) {
    dropdown.classList.add("hidden");
  }
});
