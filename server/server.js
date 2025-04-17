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

// Middlewares
// app.use(cors());
// app.use(bodyParser.json());
app.use(limiter);

// Trust frontend proxy
// app.set("trust proxy", 1);

app.use(limiter);

// Increase the limit on the body size of JSON requests
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
    await exiftool.write(filePath, exifData, {
      writeArgs: [
        "-overwrite_original",
        // "-gps:all=", // Clear all GPS fields before writing new ones
        "-preserve",
      ],
    });
    res.send("EXIF data updated successfully.");
  } catch (error) {
    console.error("Error updating EXIF data:", error);
    res.status(500).send("Error updating EXIF data.");
  }
});

app.get("/hello", (req, res) => {
  res.json({ message: "Hello from the server!" });
});

const frontendPath = path.resolve(__dirname, "../public");
app.use(express.static(frontendPath));

// Fallback for frontend routing to work (Single Page App)
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
