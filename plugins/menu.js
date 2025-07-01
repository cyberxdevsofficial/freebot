module.exports = (sock) => {
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const mek = messages[0];
      if (!mek?.message || !mek.key.fromMe) return; // only respond to incoming messages

      const messageContent = mek.message.conversation || 
                             mek.message.extendedTextMessage?.text || 
                             "";

      const body = messageContent.trim().toLowerCase();

      if (body === ".menu") {
        // React with 💡 emoji to user's message
        await sock.sendMessage(mek.key.remoteJid, {
          react: { key: mek.key, text: "💡" }
        });

        // Menu text
        const menuText = `👋 Hello! Welcome to *MAHII MD Bot* 🤖

Here are some commands you can try:

.menu - Show this menu
.status - Check bot status
.help - Get help info
More features coming soon!`;

        // Send menu text quoting user's message
        await sock.sendMessage(mek.key.remoteJid, {
          text: menuText
        }, { quoted: mek });
      }
    } catch (err) {
      console.error("❌ Error in menu plugin:", err);
    }
  });
};
