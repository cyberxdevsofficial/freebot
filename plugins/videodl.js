// plugins/videodl.js
const { cmd } = require("../command"); // Make sure command.js exists and exports cmd
const yts = require("yt-search");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

// Simple cache to prevent repeated downloads/searches
const cache = new Map();

function normalizeYouTubeUrl(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/);
  return match ? `https://youtube.com/watch?v=${match[1]}` : null;
}

function getVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function downloadAndValidateVideo(url, retries = 2) {
  try {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `video_${Date.now()}.mp4`);
    const response = await axios({ method: "get", url, responseType: "stream", timeout: 30000 });
    const writer = require("fs").createWriteStream(tempFile);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });
    const stats = await fs.stat(tempFile);
    if (stats.size < 100000) {
      await fs.unlink(tempFile).catch(() => {});
      if (retries > 0) return downloadAndValidateVideo(url, retries - 1);
      return null;
    }
    return tempFile;
  } catch (error) {
    if (retries > 0) return downloadAndValidateVideo(url, retries - 1);
    return null;
  }
}

async function searchYouTube(query, maxResults = 1) {
  const cacheKey = `search:${query}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  try {
    const searchResults = await yts({ query, pages: 1 });
    const videos = searchResults.videos.slice(0, maxResults);
    cache.set(cacheKey, videos);
    setTimeout(() => cache.delete(cacheKey), 1800000); 
    return videos;
  } catch {
    return [];
  }
}

// Export plugin as a function
module.exports = (sock) => {
  cmd(
    {
      pattern: "video4",
      alias: ["ytvideo4", "mp4", "ytmp4"],
      react: "🎬",
      desc: "Download YouTube videos",
      category: "ice kingdom",
      filename: __filename,
    },
    async (robin, mek, m, { from, q, reply }) => {
      try {
        if (!q) return reply("❌ GIVE ME THE VIDEO NAME OR URL");

        await robin.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        const url = normalizeYouTubeUrl(q);
        let ytdata;

        if (url) {
          const searchResults = await searchYouTube(url);
          if (!searchResults.length) return reply("❌ Video not found!");
          ytdata = searchResults[0];
        } else {
          const searchResults = await searchYouTube(q);
          if (!searchResults.length) return reply("❌ No videos found matching your query!");
          ytdata = searchResults[0];
        }

        const desc = `🎬 *${ytdata.title}*\n⏱️ Duration: ${ytdata.timestamp}\n🔗 Link: ${ytdata.url}`;
        await robin.sendMessage(from, { image: { url: ytdata.thumbnail }, caption: desc }, { quoted: mek });

      } catch (e) {
        console.error("Command error:", e);
        await robin.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`⚠️ *Error:* ${e.message || "Unknown error occurred"}`);
      }
    }
  );
};
