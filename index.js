const express = require("express");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
require("events").EventEmitter.defaultMaxListeners = 500;

// Serve static files (like HTML, CSS, JS) from root folder
app.use(express.static(__dirname)); // ⬅️ This is important

// API routes
const code = require("./pair");
const qr = require("./qr");    // QR route එක import කරගන්න

app.use("/code", code);
app.use("/qr", qr);            // QR route එක attach කරමු

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(PORT, () => {
  console.log(`⏩ Server running on http://localhost:${PORT}`);
});

module.exports = app;
