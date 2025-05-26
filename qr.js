const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
let router = express.Router();
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

// Delete session folder
function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/qr", async (req, res) => {
  async function GenerateQR() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");

    try {
      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        printQRInTerminal:true,
        logger: pino({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
      });

      // Send QR code to client
      sock.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
        if (qr && !res.headersSent) {
          return res.send({ qr }); // return QR to client
        }

        if (connection === "open") {
          try {
            await delay(10000);

            const user_jid = jidNormalizedUser(sock.user.id);
            const sessionPath = "./session/";

            // Random Mega filename generator
            function randomMegaId(length = 6, numberLength = 4) {
              const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
              let result = "";
              for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
              }
              const number = Math.floor(Math.random() * Math.pow(10, numberLength));
              return `${result}${number}`;
            }

            // Upload to MEGA
            const mega_url = await upload(
              fs.createReadStream(sessionPath + "creds.json"),
              `${randomMegaId()}.json`
            );

            const string_session = mega_url.replace("https://mega.nz/file/", "");

            const sid = `*✅ MAHII-MD Session Connected Successfully!*\n\n🔐 *Session ID:* \n👉 ${string_session} 👈\n\n📌 *Please copy and paste this Session ID into your* \`config.js\` *file to activate your bot.*\n\n💬 *Need help? Contact support:* \nhttps://wa.me/94715450089`;

            const mg = `⚠️ *Security Notice:*\n\n*Do NOT share this Session ID with anyone.*\n\n*මෙම කේතය කිසිවෙකුටත් ලබා නොදෙන්න. ඔබගේ ගිණුම සුරක්ෂිත විය යුතුය.*`;

            // Send messages
            await sock.sendMessage(user_jid, {
              image: {
                url: "https://raw.githubusercontent.com/Mahii-Botz/Mahii-md-LOGO/refs/heads/main/ChatGPT%20Image%20Apr%2021%2C%202025%2C%2005_32_50%20PM.png",
              },
              caption: sid,
            });
            await sock.sendMessage(user_jid, { text: string_session });
            await sock.sendMessage(user_jid, { text: mg });

            await delay(100);
            await removeFile("./session");
            process.exit(0);
          } catch (e) {
            console.error("QR Mode Error:", e);
            exec("pm2 restart Robin-md");
          }
        } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
          await delay(10000);
          GenerateQR();
        }
      });

      sock.ev.on("creds.update", saveCreds);
    } catch (err) {
      console.error("Fatal QR Error:", err);
      exec("pm2 restart Robin-md");
      if (!res.headersSent) {
        return res.send({ error: "QR Mode Failed" });
      }
    }
  }

  return await GenerateQR();
});

// Global crash handler
process.on("uncaughtException", function (err) {
  console.log("Caught exception:", err);
  exec("pm2 restart Robin-md");
});

module.exports = router;
