const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
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

const router = express.Router();

const SESSION_DIR = "./session";
const SESSION_FILE = path.join(SESSION_DIR, "creds.json");

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/", async (req, res) => {
  let num = req.query.number;
  if (!num) return res.status(400).json({ error: "Missing number" });

  async function RobinPair() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    try {
      let RobinPairWeb = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" }).child({ level: "fatal" })
          ),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
      });

      if (!RobinPairWeb.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, "");
        const code = await RobinPairWeb.requestPairingCode(num);
        if (!res.headersSent) {
          await res.send({ code });
        }
      }

      RobinPairWeb.ev.on("creds.update", saveCreds);

      RobinPairWeb.ev.on("connection.update", async ({ connection }) => {
        if (connection === "open") {
          try {
            console.log("✅ Connected to WhatsApp");

            await delay(5000);

            // ✅ Check if creds.json exists
            if (!fs.existsSync(SESSION_FILE)) {
              console.log("❌ Session file not found.");
              return;
            }

            // ✅ Generate MEGA session ID
            const randomMegaId = (length = 6, numberLength = 4) => {
              const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
              let result = "";
              for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              const number = Math.floor(Math.random() * Math.pow(10, numberLength));
              return `${result}${number}`;
            };

            const megaUrl = await upload(
              fs.createReadStream(SESSION_FILE),
              `${randomMegaId()}.json`
            );

            const string_session = megaUrl.replace("https://mega.nz/file/", "");

            const user_jid = jidNormalizedUser(RobinPairWeb.user.id);

            const sid = `*✅ MAHII-MD Session Connected Successfully!*\n\n🔐 *Session ID:* \n👉 ${string_session} 👈\n\n📌 *Please copy and paste this Session ID into your* \`config.js\` *file to activate your bot.*\n\n💬 *Need help? Contact support:* \nhttps://wa.me/94715450089`;

            const warning = `⚠️ *Security Notice:*\n\n*Do NOT share this Session ID with anyone.*\n\n*මෙම කේතය කිසිවෙකුටත් ලබා නොදෙන්න. ඔබගේ ගිණුම සුරක්ෂිත විය යුතුය.*`;

            await RobinPairWeb.sendMessage(user_jid, {
              image: {
                url: "https://raw.githubusercontent.com/Mahii-Botz/Mahii-md-LOGO/refs/heads/main/ChatGPT%20Image%20Apr%2021%2C%202025%2C%2005_32_50%20PM.png",
              },
              caption: sid,
            });

            await RobinPairWeb.sendMessage(user_jid, { text: string_session });
            await RobinPairWeb.sendMessage(user_jid, { text: warning });

            console.log("✅ Session link sent");

            await delay(1000);
            removeFile(SESSION_DIR); // Cleanup after
            process.exit(0);
          } catch (e) {
            console.error("❌ Upload or message failed:", e);
            exec("pm2 restart prabath");
          }
        }
      });
    } catch (err) {
      console.error("❌ Error in pairing:", err);
      exec("pm2 restart Robin-md");
      removeFile(SESSION_DIR);
      if (!res.headersSent) {
        res.status(503).json({ code: "Service Unavailable" });
      }
    }
  }

  return await RobinPair();
});

// Global error handler
process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err);
  exec("pm2 restart Robin");
});

module.exports = router;
