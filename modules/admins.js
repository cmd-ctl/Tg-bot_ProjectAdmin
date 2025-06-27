const fs = require('fs');
const path = require('path');

module.exports = function setup({ bot, config, logger }) {
    const configPath = path.join(__dirname, '..', 'config.json');

    function saveAdmins(newList) {
        config.adminIds = newList;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    bot.onText(/\/admins/, (msg) => {
        if (!config.adminIds.includes(msg.from.id)) return;
        const list = config.adminIds.map(id => `• ${id}`).join('\n');
        bot.sendMessage(msg.chat.id, `👮 *Admin Users:*

${list}`, { parse_mode: 'Markdown' });
    });

    bot.onText(/\/addadmin (\d+)/, (msg, match) => {
        if (!config.adminIds.includes(msg.from.id)) return;
        const id = parseInt(match[1]);
        if (!config.adminIds.includes(id)) {
            config.adminIds.push(id);
            saveAdmins(config.adminIds);
            bot.sendMessage(msg.chat.id, `✅ User ${id} added to admin list.`);
        } else {
            bot.sendMessage(msg.chat.id, `ℹ️ User ${id} is already admin.`);
        }
    });

    bot.onText(/\/removeadmin (\d+)/, (msg, match) => {
        if (!config.adminIds.includes(msg.from.id)) return;
        const id = parseInt(match[1]);
        config.adminIds = config.adminIds.filter(adminId => adminId !== id);
        saveAdmins(config.adminIds);
        bot.sendMessage(msg.chat.id, `🗑️ User ${id} removed from admin list.`);
    });
};