const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const { exiftool } = require("exiftool-vendored");
const RateLimit = require("express-rate-limit");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const PORT = process.env.PORT || 3000;

const rootDir = path.resolve(__dirname, "./media");
const limiter = RateLimit({
  windowsMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // max 100 requests per windowMS
});

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(limiter);

// Trust frontend proxy
app.set("trust proxy", 1);

app.use(limiter);

// Aumentar el límite del tamaño del cuerpo de las solicitudes JSON
app.use(express.json({ limit: "100mb" }));
app.use(express.static(rootDir));

// Listar archivos multimedia en la raíz del proyecto
app.get("/api/files", (req, res) => {
  const relPath = req.query.path || "";
  const targetPath = path.join(rootDir, relPath);

  if (!targetPath.startsWith(rootDir)) {
    return res.status(400).send("Invalid path.");
  }

  fs.readdir(targetPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      return res.status(500).send("Error reading directory.");
    }

    const result = entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }));

    res.json({ path: relPath, entries: result });
  });
});

// Actualizar datos EXIF de un archivo
app.post("/api/update-exif", async (req, res) => {
  const { fileName, exifData } = req.body;
  const filePath = path.resolve(rootDir, fileName);

  if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath)) {
    return res.status(404).send("File not found or invalid path.");
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

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the server!" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
