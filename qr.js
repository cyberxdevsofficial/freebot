const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const router = express.Router();
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const { upload } = require("./mega");

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/qr", async (req, res) => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("./session");

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
      },
      printQRInTerminal: true,
      logger: pino({ level: "fatal" }),
      browser: Browsers.macOS("Safari"),
    });

    // Listen for QR code once, then send it and no more
    sock.ev.once("connection.update", async (update) => {
      const { qr, connection, lastDisconnect } = update;

      if (qr) {
        return res.json({ qr });
      }

      if (connection === "open") {
        try {
          await delay(10000);
          const user_jid = jidNormalizedUser(sock.user.id);
          const sessionPath = "./session/";

          function randomMegaId(length = 6, numberLength = 4) {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let result = "";
            for (let i = 0; i < length; i++) {
              result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
            return `${result}${number}`;
          }

          const mega_url = await upload(
            fs.createReadStream(sessionPath + "creds.json"),
            `${randomMegaId()}.json`
          );

          const string_session = mega_url.replace("https://mega.nz/file/", "");

          const sid = `*✅ MAHII-MD Session Connected Successfully!*\n\n🔐 *Session ID:* \n👉 ${string_session} 👈\n\n📌 *Please copy and paste this Session ID into your* \`config.js\` *file to activate your bot.*\n\n💬 *Need help? Contact support:* \nhttps://wa.me/94715450089`;

          const mg = `⚠️ *Security Notice:*\n\n*Do NOT share this Session ID with anyone.*\n\n*මෙම කේතය කිසිවෙකුටත් ලබා නොදෙන්න. ඔබගේ ගිණුම සුරක්ෂිත විය යුතුය.*`;

          await sock.sendMessage(user_jid, {
            image: {
              url: "https://raw.githubusercontent.com/Mahii-Botz/Mahii-md-LOGO/refs/heads/main/ChatGPT%20Image%20Apr%2021%2C%202025%2C%2005_32_50%20PM.png",
            },
            caption: sid,
          });

          await sock.sendMessage(user_jid, { text: string_session });
          await sock.sendMessage(user_jid, { text: mg });

          await delay(100);
          removeFile("./session");
          process.exit(0);
        } catch (e) {
          console.error("QR Mode Error:", e);
          exec("pm2 restart Robin-md");
        }
      }

      if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
        // restart pairing on disconnect
        exec("pm2 restart Robin-md");
      }
    });

    sock.ev.on("creds.update", saveCreds);
  } catch (err) {
    console.error("Fatal QR Error:", err);
    exec("pm2 restart Robin-md");
    if (!res.headersSent) {
      res.status(503).json({ error: "QR Mode Failed" });
    }
  }
});

process.on("uncaughtException", (err) => {
  console.log("Caught exception:", err);
  exec("pm2 restart Robin-md");
});

module.exports = router;
