document
  .getElementById("fileInput")
  .addEventListener("change", handleFileSelect);
document.getElementById("saveButton").addEventListener("click", saveChanges);

function handleFileSelect(event) {
  const files = event.target.files;
  const exifDataDiv = document.getElementById("exifData");
  exifDataDiv.innerHTML = "";

  for (let file of files) {
    EXIF.getData(file, function () {
      const exifData = EXIF.getAllTags(this);
      displayExifData(exifData, exifDataDiv);
    });
  }
}

function displayExifData(exifData, container) {
  const exifList = document.createElement("ul");
  for (let tag in exifData) {
    const listItem = document.createElement("li");
    listItem.textContent = `${tag}: ${exifData[tag]}`;
    exifList.appendChild(listItem);
  }
  container.appendChild(exifList);
}

function saveChanges() {
  // Implement save logic here
  alert("Save functionality is not implemented yet.");
}
