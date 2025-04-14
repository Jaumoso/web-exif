const express = require("express");
const multer = require("multer");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static(path.join(__dirname, "..")));

app.post("/upload", upload.array("files"), (req, res) => {
  res.send("Files uploaded successfully.");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
