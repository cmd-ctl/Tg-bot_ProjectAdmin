const os = require('os');
let prettyMs = require('pretty-ms');
if (typeof prettyMs !== 'function' && typeof prettyMs.default === 'function') {
    prettyMs = prettyMs.default;
}

module.exports = function setup({ bot, config }) {
    const admins = config.adminIds;

    bot.onText(/\/sysinfo/, (msg) => {
        if (!admins.includes(msg.from.id)) return;

        try {
            const uptime = prettyMs(os.uptime() * 1000);
            const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
            const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
            const usedMem = (totalMem - freeMem).toFixed(1);
            const cpuLoad = os.loadavg()[0].toFixed(2);

            const reply = `🖥️ *System Info:*\n\n` +
                `• Uptime: \`${uptime}\`\n` +
                `• CPU Load (1 min): \`${cpuLoad}\`\n` +
                `• Memory: \`${usedMem} / ${totalMem} GB\`\n` +
                `• Platform: \`${os.platform()} (${os.arch()})\`\n` +
                `• Hostname: \`${os.hostname()}\``;

            bot.sendMessage(msg.chat.id, reply, { parse_mode: 'Markdown' });
        } catch (err) {
            bot.sendMessage(msg.chat.id, '❌ Error retrieving information: ' + err.message);
        }
    });
};
