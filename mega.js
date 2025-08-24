const { Storage, File } = require("megajs");
const fs = require("fs");

const auth = {
  email: "mahiyabotz@gmail.com",
  password: "mutgmw@0624",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
};

/**
 * Initialize MEGA storage
 */
const initStorage = () => {
  return new Promise((resolve, reject) => {
    const storage = new Storage(auth);
    storage.on("ready", () => resolve(storage));
    storage.on("error", (err) => reject(err));
  });
};

/**
 * Upload session file (Buffer or Stream)
 */
const upload = async (data, name) => {
  const storage = await initStorage();
  const uploadStream = storage.upload({ name, allowUploadBuffering: true });

  return new Promise((resolve, reject) => {
    uploadStream.on("complete", (file) => {
      file.link((err, url) => {
        storage.close();
        if (err) return reject(err);
        resolve(url);
      });
    });
    uploadStream.on("error", (err) => {
      storage.close();
      reject(err);
    });

    if (Buffer.isBuffer(data)) uploadStream.end(data);
    else data.pipe(uploadStream);
  });
};

/**
 * Download file from MEGA and save locally
 * Accepts full URL OR just the file ID
 */
const download = (fileIdOrUrl, outputPath) => {
  return new Promise((resolve, reject) => {
    // If only ID is passed, prepend URL
    let url = fileIdOrUrl;
    if (!/^https?:\/\//.test(fileIdOrUrl)) url = `https://mega.nz/file/${fileIdOrUrl}`;

    const file = File.fromURL(url, { auth });
    file.loadAttributes((err) => {
      if (err) return reject(err);

      const writeStream = fs.createWriteStream(outputPath);
      file.download().pipe(writeStream);

      writeStream.on("finish", () => resolve(true));
      writeStream.on("error", reject);
    });
  });
};

module.exports = { upload, download };
