// lib/functions.js
const fetch = require("node-fetch");

/**
 * Fetch JSON from a URL
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  return await res.json();
}

module.exports = { fetchJson };
