module.exports = (sock) => {
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const mek = messages[0];
      if (!mek?.message || mek.key.fromMe) return; // Incoming messagesට පමණක් respond වෙන්න

      const messageContent =
        mek.message.conversation ||
        mek.message.extendedTextMessage?.text ||
        "";

      const body = messageContent.trim().toLowerCase();

      if (body === ".menu") {
        // 💡 emoji reaction එක දෙනවා
        await sock.sendMessage(mek.key.remoteJid, {
          react: { key: mek.key, text: "📜" },
        });

        const madeMenu = `
╭─「 📜 ᴍᴇɴᴜ ᴏᴘᴛɪᴏɴꜱ 」 
│ ⚙️ *MAIN COMMANDS*
│   ➥ .menu
│   ➥ .status
│   ➥ .help
│   *More features coming soon!*
╰──────────●●►
`.trim();

        // Image + caption send කරමින් user message එක quote කරනවා
        await sock.sendMessage(
          mek.key.remoteJid,
          {
            image: {
              url: "https://github.com/Mahii-Botz/Mahii-md-LOGO/blob/main/ChatGPT%20Image%20Apr%2021,%202025,%2005_32_50%20PM.png?raw=true",
            },
            caption: madeMenu,
          },
          { quoted: mek }
        );
      }
    } catch (err) {
      console.error("❌ Error in menu plugin:", err);
    }
  });
};
