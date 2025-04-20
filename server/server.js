const express = require("express");
const path = require("path");
const fs = require("fs");
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
app.use(limiter);
app.use(express.json({ limit: "100mb" }));
app.use(express.static(rootDir));

// List media files in the root folder
app.get("/files", (req, res) => {
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

// Update EXIF ​​data of a file
app.post("/update-exif", async (req, res) => {
  const { fileName, exifData } = req.body;
  const filePath = path.resolve(rootDir, fileName);

  if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath)) {
    return res.status(404).send("File not found or invalid path.");
  }

  try {
    console.log("Received EXIF data:", exifData);
    const filteredExifData = Object.fromEntries(
      Object.entries(exifData).filter(([key]) => {
        return !ignoredTags.includes(key) && !unwritableTags.includes(key);
      })
    );
    const result = await exiftool.write(filePath, filteredExifData, {
      writeArgs: ["-overwrite_original", "-gps:all=", "-preserve"],
    });
    console.log("Exiftool result:", result);

    res.json({
      message: "EXIF data updated successfully.",
      warnings: result.warnings || [],
    });
  } catch (error) {
    console.error("Error updating EXIF data:", error);
    res.status(500).send("Error updating EXIF data.");
  }
});

app.get("/exif", async (req, res) => {
  const { fileName } = req.query;
  const filePath = path.resolve(rootDir, fileName);

  if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath)) {
    return res.status(404).send("File not found or invalid path.");
  }

  try {
    const tags = await exiftool.read(filePath);
    console.log("Exiftool tags:", tags);
    res.json(tags);
  } catch (error) {
    console.error("Error reading EXIF data:", error);
    res.status(500).send("Error reading EXIF data.");
  }
});

app.get("/hello", (_, res) => {
  res.json({ message: "Hello from the server!" });
});

const frontendPath = path.resolve(__dirname, "../public");
app.use(express.static(frontendPath));

app.get("/", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const ignoredTags = ["errors", "warnings", "thumbnail"];
const unwritableTags = [
  "LightValue",
  "ExifToolVersion",
  "FileSize",
  "FileAccessDate",
  "FileType",
  "FileTypeExtension",
  "MIMEType",
  "JFIFVersion",
  "ProfileCMMType",
  "ProfileVersion",
  "ProfileClass",
  "ColorSpaceData",
  "ProfileConnectionSpace",
  "ProfileDateTime",
  "ProfileFileSignature",
  "PrimaryPlatform",
  "CMMFlags",
  "DeviceManufacturer",
  "DeviceModel",
  "DeviceAttributes",
  "RenderingIntent",
  "ConnectionSpaceIlluminant",
  "ProfileCreator",
  "ProfileID",
  "ProfileDescription",
  "MediaWhitePoint",
  "MediaBlackPoint",
  "RedMatrixColumn",
  "GreenMatrixColumn",
  "BlueMatrixColumn",
  "RedTRC",
  "GreenTRC",
  "BlueTRC",
  "ChromaticAdaptation",
  "EncodingProcess",
  "ColorComponents",
  "Aperture",
  "Megapixels",
  "ScaleFactor35efl",
  "ShutterSpeed",
  "CircleOfConfusion",
  "DOF",
  "FOV",
  "FocalLength35efl",
  "HyperfocalDistance",
  "LightValue",
  "ZoneIndentifier",
];
