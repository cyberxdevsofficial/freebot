// command.js
// Simple command registration system for WhatsApp bot

const commands = [];

/**
 * Register a new command
 * @param {Object} options - Command options
 * @param {Function} handler - Function to run when command is called
 */
function cmd(options, handler) {
  // options example: { pattern, alias, desc, category, filename, react }
  commands.push({ options, handler });
  console.log(`✅ Command registered: ${options.pattern}`);
  return { options, handler };
}

module.exports = { cmd, commands };
