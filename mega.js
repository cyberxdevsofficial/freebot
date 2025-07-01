const mega = require("megajs");
const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");

const auth = {
  email: "mahiyabotz@gmail.com",
  password: "mutgmw@0624",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
};

// Upload a stream or file buffer (you may keep it same)
const upload = (data, name) => {
  return new Promise((resolve, reject) => {
    const storage = new mega.Storage(auth);

    storage.on("ready", () => {
      console.log("Storage ready. Uploading...");

      const uploadStream = storage.upload({ name, allowUploadBuffering: true });

      uploadStream.on("complete", (file) => {
        file.link((err, url) => {
          if (err) reject(err);
          else {
            storage.close();
            resolve(url);
          }
        });
      });

      uploadStream.on("error", reject);

      data.pipe(uploadStream);
    });

    storage.on("error", reject);
  });
};

// Download and unzip the session ZIP file to folderPath
const download = (sessionId, folderPath) => {
  return new Promise((resolve, reject) => {
    const url = `https://mega.nz/file/${sessionId}`;

    const file = mega.File.fromURL(url, { auth });

    file.loadAttributes((err) => {
      if (err) return reject(err);

      // Create write stream for the downloaded zip file
      const zipPath = path.join(folderPath, "session.zip");

      // Make sure folder exists
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

      const writeStream = fs.createWriteStream(zipPath);

      file.download().pipe(writeStream);

      writeStream.on("finish", () => {
        // Unzip the session.zip into folderPath
        fs.createReadStream(zipPath)
          .pipe(unzipper.Extract({ path: folderPath }))
          .on("close", () => {
            // Delete the zip after extraction
            fs.unlinkSync(zipPath);
            resolve(true);
          })
          .on("error", reject);
      });

      writeStream.on("error", reject);
    });
  });
};

module.exports = { upload, download };
