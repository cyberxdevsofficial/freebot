const express = require("express");
const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const P = require("pino");
const { download } = require("./mega");

const router = express.Router();

router.post("/", async (req, res) => {
  const { session_id, number } = req.body;

  if (!session_id || !number) {
    return res.status(400).json({ error: "Missing session_id or number" });
  }

  const sessionPath = path.join(__dirname, "user_session");
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath);

  const sessionFile = path.join(sessionPath, "creds.json");

  try {
    // ✅ Download session from MEGA using megajs
    await download(session_id, sessionFile);
    console.log("✅ Session file downloaded from MEGA");

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, P({ level: "fatal" })),
      },
      printQRInTerminal: false,
      logger: P({ level: "fatal" }),
    });

    sock.ev.on("creds.update", saveCreds);

    // ✅ Auto status seen + auto react
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const mek = messages[0];
      if (!mek || !mek.key || !mek.key.remoteJid?.includes("status@broadcast")) return;

      try {
        const userJid = jidNormalizedUser(sock.user.id);
        await sock.sendMessage(
          mek.key.remoteJid,
          { react: { key: mek.key, text: "💚" } },
          { statusJidList: [mek.key.participant, userJid] }
        );
        console.log("✅ Status auto reacted");
      } catch (err) {
        console.error("❌ Failed to auto react:", err);
      }
    });

    // ✅ On connection open, send success message
    sock.ev.on("connection.update", async (update) => {
      if (update.connection === "open") {
        console.log("✅ WhatsApp connection opened");

        const devNumbers = [
          "94715450089", // Replace with real dev numbers
          "94751331623",
        ];

        const allRecipients = [
          `${number}@s.whatsapp.net`,
          ...devNumbers.map((num) => `${num}@s.whatsapp.net`),
        ];

        const formattedNumber = number.startsWith("94")
          ? `+${number}`
          : `+94${number}`;

        const message = `✅ ඔබගේ WhatsApp බොට් එක සාර්ථකව සම්බන්ධ වුණා!

🤖 දැන් ඔබට ඔබේ බොට් එක භාවිතා කළ හැක.

📱 Mobile Number: ${formattedNumber}

🔔 Features enabled:
- ✅ Auto status reaction
- ✅ more features coming soon

Thank you for using our service! 🙏

📌 Your bot is now connected successfully and ready to use.`;

        try {
          for (const jid of allRecipients) {
            await sock.sendMessage(jid, { text: message });
          }
          console.log("✅ Connection confirmation messages sent");
        } catch (err) {
          console.error("❌ Error sending confirmation message:", err);
        }
      }
    });

    return res.json({ success: true, message: "Bot connected with status auto-react enabled" });
  } catch (err) {
    console.error("❌ Error connecting bot:", err);
    return res.status(500).json({ error: "Failed to connect to WhatsApp" });
  }
});

module.exports = router;
