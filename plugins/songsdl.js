const { cmd } = require("../command");
const yts = require("yt-search");
const { fetchJson } = require("../lib/functions");

/**
 * Extract YouTube Video ID from URL
 */
function extractYouTubeId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|playlist\?list=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * Convert any YouTube URL to standard watch link
 */
function convertYouTubeLink(q) {
    const videoId = extractYouTubeId(q);
    if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
    return q;
}

cmd({
    pattern: "song",
    alias: ["play", "songdl"],
    desc: "Download a song from YouTube",
    react: "🎵",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, q, reply }) => {
    try {
        q = convertYouTubeLink(q);
        if (!q) return reply("*Please provide a YouTube link or title!*");

        const search = await yts(q);
        const video = search.videos[0];
        if (!video) return reply("*No video found for your query!*");

        const url = video.url;
        const desc = `
┏━❮ *SONG INFO* ❯━
┃🎵 *Title:* ${video.title}
┃⏱ *Duration:* ${video.timestamp}
┃👁 *Views:* ${video.views}
┃📅 *Uploaded:* ${video.ago}
┗━━━━━━━━━━━━━━
Reply with:
1️⃣ Audio 🎧
2️⃣ Document 📁
3️⃣ Voice 🎤
`;

        const info = `✨ Powered by MAHII-MD Bot ✨`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: desc
        }, { quoted: mek });

        const messageID = sentMsg.key.id;

        conn.ev.on("messages.upsert", async (update) => {
            const mek = update.messages[0];
            if (!mek?.message) return;

            const messageType =
                mek.message.conversation ||
                mek.message.extendedTextMessage?.text ||
                mek.message?.imageMessage?.caption ||
                '';

            const isReplyToSentMsg =
                mek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (!isReplyToSentMsg) return;

            const apiUrl = `https://lakiya-api-site.vercel.app/download/ytmp3new?url=${url}&type=mp3`;
            const down = await fetchJson(apiUrl);
            const downloadUrl = down.result.downloadUrl;

            // Audio
            if (messageType === "1") {
                await conn.sendMessage(from, { react: { key: mek.key, text: "📥" } });
                await conn.sendMessage(from, {
                    audio: { url: downloadUrl },
                    mimetype: "audio/mpeg",
                    contextInfo: {
                        externalAdReply: {
                            title: video.title,
                            body: video.videoId,
                            mediaType: 1,
                            sourceUrl: video.url,
                            thumbnailUrl: video.thumbnail,
                        }
                    }
                }, { quoted: mek });

            // Document
            } else if (messageType === "2") {
                await conn.sendMessage(from, { react: { key: mek.key, text: "📥" } });
                await conn.sendMessage(from, {
                    document: { url: downloadUrl },
                    mimetype: "audio/mp3",
                    fileName: `${video.title}.mp3`,
                    caption: info
                }, { quoted: mek });

            // Voice note
            } else if (messageType === "3") {
                await conn.sendMessage(from, { react: { key: mek.key, text: "📥" } });
                await conn.sendMessage(from, {
                    audio: { url: downloadUrl },
                    mimetype: "audio/mpeg",
                    ptt: true
                }, { quoted: mek });
            }
        });

    } catch (err) {
        console.log(err);
        reply(`❌ Error: ${err.message}`);
    }
});
