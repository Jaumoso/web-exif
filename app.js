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
