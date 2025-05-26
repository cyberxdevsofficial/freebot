const express = require("express");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
require("events").EventEmitter.defaultMaxListeners = 500;

// API routes (must be before static)
const code = require("./pair");
const qr = require("./qr");

app.use("/code", code);
app.use("/qr", qr);

// Serve static files (like HTML, CSS, JS) from root folder
app.use(express.static(__dirname));

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(PORT, () => {
  console.log(`⏩ Server running on http://localhost:${PORT}`);
});

module.exports = app;
