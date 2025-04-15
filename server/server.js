const express = require("express");
const path = require("path");
const fs = require("fs");
const { exiftool } = require("exiftool-vendored");

const app = express();
const rootDir = path.resolve(__dirname, "../");

// Aumentar el límite del tamaño del cuerpo de las solicitudes JSON
app.use(express.json({ limit: "100mb" })); // Cambia "10mb" según tus necesidades
app.use(express.static(rootDir));

// Listar archivos multimedia en la raíz del proyecto
app.get("/files", (req, res) => {
  fs.readdir(rootDir, (err, files) => {
    if (err) {
      return res.status(500).send("Error reading files.");
    }
    const mediaFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|mp4|mov)$/i.test(file)
    );
    res.json(mediaFiles);
  });
});

// Actualizar datos EXIF de un archivo
app.post("/update-exif", async (req, res) => {
  const { fileName, exifData } = req.body;
  const filePath = path.join(rootDir, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }

  try {
    await exiftool.write(filePath, exifData, [
      "-overwrite_original",
      // "-gps:all=", // Limpia todos los campos GPS antes
      "-preserve",
    ]);
    res.send("EXIF data updated successfully.");
  } catch (error) {
    console.error("Error updating EXIF data:", error);
    res.status(500).send("Error updating EXIF data.");
  }
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
