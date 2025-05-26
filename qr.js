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
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
      },
      printQRInTerminal: false,
      logger: pino({ level: "fatal" }).child({ level: "fatal" }),
      browser: Browsers.macOS("Safari"),
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        // QR code එක clientට දීම සඳහා response එකෙන් යවන්න
        res.json({ qr });
      }

      if (connection === "open") {
        // Log වෙලා session save වෙලා ඇති විට Mega upload කරලා session ID generate කරන part එක
        try {
          await delay(10000);

          const auth_path = "./session/";
          const user_jid = jidNormalizedUser(sock.user.id);

          // Mega ID හදන්න helper function
          function randomMegaId(length = 6, numberLength = 4) {
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let result = "";
            for (let i = 0; i < length; i++) {
              result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
            return `${result}${number}`;
          }

          const mega_url = await upload(
            fs.createReadStream(auth_path + "creds.json"),
            `${randomMegaId()}.json`
          );

          const string_session = mega_url.replace("https://mega.nz/file/", "");

          const sid = `*✅ MAHII-MD Session Connected Successfully!*\n\n🔐 *Session ID:* \n👉 ${string_session} 👈\n\n📌 *Please copy and paste this Session ID into your* \`config.js\` *file to activate your bot.*\n\n💬 *Need help? Contact support:* \nhttps://wa.me/94715450089`;

          const mg = `⚠️ *Security Notice:*\n\n*Do NOT share this Session ID with anyone.*\n\n*මෙම කේතය කිසිවෙකුටත් ලබා නොදෙන්න. ඔබගේ ගිණුම සුරක්ෂිත විය යුතුය.*`;

          // Userට WhatsApp message 3ක් යවයි - logo pic + session id + security notice
          await sock.sendMessage(user_jid, {
            image: {
              url: "https://raw.githubusercontent.com/Mahii-Botz/Mahii-md-LOGO/refs/heads/main/ChatGPT%20Image%20Apr%2021%2C%202025%2C%2005_32_50%20PM.png",
            },
            caption: sid,
          });

          await sock.sendMessage(user_jid, { text: string_session });
          await sock.sendMessage(user_jid, { text: mg });

          // Session folder clean up
          await delay(100);
          await removeFile("./session");
          process.exit(0);
        } catch (e) {
          console.error("Error uploading session and sending message:", e);
          exec("pm2 restart Robin-md");
        }
      }

      if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
        await delay(10000);
        // Restart pairing on disconnect unless unauthorized
        router.get("/qr");
      }
    });

  } catch (err) {
    console.error("Error in QR pairing:", err);
    exec("pm2 restart Robin-md");
    if (!res.headersSent) {
      res.json({ error: "Service Unavailable" });
    }
  }
});

module.exports = router;
