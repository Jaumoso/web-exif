document.addEventListener("DOMContentLoaded", () => {
  loadFiles();
});

async function loadFiles() {
  const fileListContainer = document.getElementById("fileList");
  fileListContainer.innerHTML = "<p>Loading files...</p>";

  try {
    const response = await fetch("/files");
    const files = await response.json();

    fileListContainer.innerHTML = "";
    files.forEach((file) => {
      const fileItem = document.createElement("div");
      fileItem.className = "file-item";
      fileItem.textContent = file;
      fileItem.addEventListener("click", () => loadExifData(file));
      fileListContainer.appendChild(fileItem);
    });
  } catch (error) {
    console.error("Error loading files:", error);
    fileListContainer.innerHTML = "<p>Error loading files.</p>";
  }
}

async function loadExifData(fileName) {
  const exifDataContainer = document.getElementById("exifData");
  exifDataContainer.innerHTML = "<p>Loading EXIF data...</p>";

  try {
    // Crear un elemento <img> para cargar el archivo
    const img = new Image();
    img.src = `/${fileName}`;
    img.onload = () => {
      EXIF.getData(img, function () {
        const exifData = EXIF.getAllTags(this);

        exifDataContainer.innerHTML = `<h3>EXIF Data for ${fileName}</h3>`;
        const exifList = document.createElement("ul");

        for (let tag in exifData) {
          const listItem = document.createElement("li");
          const label = document.createElement("label");
          label.textContent = `${tag}: `;

          const input = document.createElement("input");
          input.type = "text";
          input.value = exifData[tag];
          input.dataset.tag = tag;

          listItem.appendChild(label);
          listItem.appendChild(input);
          exifList.appendChild(listItem);
        }

        exifDataContainer.appendChild(exifList);

        const saveButton = document.createElement("button");
        saveButton.textContent = "Save Changes";
        saveButton.addEventListener("click", () =>
          saveExifData(fileName, exifList)
        );
        exifDataContainer.appendChild(saveButton);

        // Centrar el mapa si hay coordenadas
        if (exifData.GPSLatitude && exifData.GPSLongitude) {
          const lat = convertDMSToDD(
            exifData.GPSLatitude,
            exifData.GPSLatitudeRef
          );
          const lon = convertDMSToDD(
            exifData.GPSLongitude,
            exifData.GPSLongitudeRef
          );
          marker.setLatLng([lat, lon]);
          map.setView([lat, lon], 14);
          document.getElementById("coordInput").value = `${lat.toFixed(
            6
          )}, ${lon.toFixed(6)}`;
        }
      });
    };

    img.onerror = () => {
      exifDataContainer.innerHTML = "<p>Error loading image for EXIF data.</p>";
    };
  } catch (error) {
    console.error("Error loading EXIF data:", error);
    exifDataContainer.innerHTML = "<p>Error loading EXIF data.</p>";
  }
}

// Llamar al inicializador del mapa cuando se cargue el DOM
document.addEventListener("DOMContentLoaded", () => {
  initMap();
});

function convertDMSToDD(dms, ref) {
  let degrees, minutes, seconds;

  if (Array.isArray(dms)) {
    // Si es un array tipo [48, 51, 30.12]
    [degrees, minutes, seconds] = dms.map(parseFloat);
  } else if (typeof dms === "string") {
    // Intenta extraer con regex flexible
    const match = dms.exec(/(\d+)[°\s]*\s*(\d+)'?\s*(\d+(?:\.\d+)?)/);
    if (!match) return null;

    degrees = parseFloat(match[1]);
    minutes = parseFloat(match[2]);
    seconds = parseFloat(match[3]);
  } else {
    return null;
  }

  let dd = degrees + minutes / 60 + seconds / 3600;

  if (ref === "S" || ref === "W") dd *= -1;

  return dd;
}
async function saveExifData(fileName, exifList) {
  const updatedExif = {};
  const inputs = exifList.getElementsByTagName("input");

  for (let input of inputs) {
    updatedExif[input.dataset.tag] = input.value;
  }

  try {
    const response = await fetch("/update-exif", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileName, exifData: updatedExif }),
    });

    if (response.ok) {
      alert("EXIF data updated successfully.");
    } else {
      alert("Error updating EXIF data.");
    }
  } catch (error) {
    console.error("Error saving EXIF data:", error);
    alert("Error saving EXIF data.");
  }
}

let map, marker;

function initMap() {
  map = L.map("map").setView([0, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  marker = L.marker([0, 0], { draggable: true }).addTo(map);

  marker.on("dragend", () => {
    const { lat, lng } = marker.getLatLng();
    document.getElementById("coordInput").value = `${lat.toFixed(
      6
    )}, ${lng.toFixed(6)}`;
    updateExifInputsFromCoords(lat, lng);
  });

  map.on("click", (e) => {
    const { lat, lng } = e.latlng;
    marker.setLatLng(e.latlng);
    document.getElementById("coordInput").value = `${lat.toFixed(
      6
    )}, ${lng.toFixed(6)}`;
    updateExifInputsFromCoords(lat, lng);
  });
}

function updateFromCoords() {
  const input = document.getElementById("coordInput").value;
  const [lat, lon] = input.split(",").map((n) => parseFloat(n.trim()));
  if (!isNaN(lat) && !isNaN(lon)) {
    marker.setLatLng([lat, lon]);
    map.setView([lat, lon], 14);
  }
}

async function searchLocation() {
  const query = document.getElementById("locationSearch").value;
  if (!query) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.length > 0) {
    const { lat, lon } = data[0];
    marker.setLatLng([lat, lon]);
    map.setView([lat, lon], 14);
    document.getElementById("coordInput").value = `${lat}, ${lon}`;
    updateExifInputsFromCoords(parseFloat(lat), parseFloat(lon));
  } else {
    alert("Location not found");
  }
}

function convertDDToDMS(dd, isLat) {
  const abs = Math.abs(dd);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(4);

  const ref = isLat ? (dd >= 0 ? "N" : "S") : dd >= 0 ? "E" : "W";

  return {
    dms: `${degrees} deg ${minutes}' ${seconds}"`,
    ref,
  };
}

function updateExifInputsFromCoords(lat, lon) {
  const latDMS = convertDDToDMS(lat, true);
  const lonDMS = convertDDToDMS(lon, false);

  // Actualiza los inputs si existen
  const latInput = document.querySelector('input[data-tag="GPSLatitude"]');
  const latRefInput = document.querySelector(
    'input[data-tag="GPSLatitudeRef"]'
  );
  const lonInput = document.querySelector('input[data-tag="GPSLongitude"]');
  const lonRefInput = document.querySelector(
    'input[data-tag="GPSLongitudeRef"]'
  );

  if (latInput) latInput.value = latDMS.dms;
  if (latRefInput) latRefInput.value = latDMS.ref;
  if (lonInput) lonInput.value = lonDMS.dms;
  if (lonRefInput) lonRefInput.value = lonDMS.ref;
}
