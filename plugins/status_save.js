const fs = require("fs");

async function statusSavePlugin(robin, mek, m, extra) {
  try {
    const { from, body } = extra;
    if (!body || !m.quoted || !mek || !mek.message) return;

    const msgStr = JSON.stringify(mek.message, null, 2);
    const msgJson = JSON.parse(msgStr);
    const isStatus = msgJson?.extendedTextMessage?.contextInfo?.remoteJid;

    if (!isStatus) return;

    const bdy = body.toLowerCase();
    const keywords = [
      "දියම්", "දෙන්න", "දාන්න", "එවන්න", "ඕන", "ඕනා", "එවපන්", "දාපන්", "එව්පන්",
      "send", "give", "ewpn", "ewapan", "ewanna", "danna", "dpn", "dapan", "ona",
      "daham", "diym", "dhm", "save", "status", "ඕනි", "ඕනී", "ewm", "ewnn"
    ];
    const lowerKeywords = keywords.map(w => w.toLowerCase());

    if (!lowerKeywords.includes(bdy)) return;

    const caption = "𝙈𝘼𝙃𝙄𝙄 𝙈𝘿 𝙎𝙏𝘼𝙏𝙐𝙎 𝘿𝙊𝙒𝙉𝙇𝙊𝘿𝙀𝙍";

    if (m.quoted.type === "imageMessage") {
      const buffer = await m.quoted.download();
      return await robin.sendMessage(from, {
        image: buffer,
        caption,
      });
    }

    if (m.quoted.type === "videoMessage") {
      const buffer = await m.quoted.download();
      return await robin.sendMessage(
        from,
        {
          video: buffer,
          mimetype: "video/mp4",
          fileName: `${m.id}.mp4`,
          caption,
        },
        { quoted: mek }
      );
    }

    if (m.quoted.type === "audioMessage") {
      const buffer = await m.quoted.download();
      return await robin.sendMessage(
        from,
        {
          audio: buffer,
          mimetype: "audio/mp3",
          ptt: true,
        },
        { quoted: mek }
      );
    }

    if (m.quoted.type === "extendedTextMessage") {
      return await robin.sendMessage(from, {
        text: m.quoted.msg.text,
      });
    }
  } catch (error) {
    console.error("❌ Error in status downloader plugin:", error);
  }
}

module.exports = statusSavePlugin;
