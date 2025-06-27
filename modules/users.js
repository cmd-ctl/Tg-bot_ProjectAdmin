
module.exports = function ({ bot, config, _, pool }) {

    const ADMIN_USER_IDS = config.adminIds;
    // /block userId true|false
    bot.onText(/\/block (\d+) (true|false)/, async (msg, match) => {
        const fromId = msg.from.id;
        const chatId = msg.chat.id;

        if (!ADMIN_USER_IDS.includes(fromId)) {
            return bot.sendMessage(chatId, '⛔ You do not have permission to use this command.');
        }

        const userId = match[1];
        const status = match[2];

        try {
            const result = await pool.query(
                'UPDATE users SET is_blocked = $2 WHERE userId = $1 RETURNING *',
                [userId, status]
            );

            if (result.rowCount === 0) {
                return bot.sendMessage(chatId, `⚠️ User with ID ${userId} not found.`);
            }

            bot.sendMessage(chatId, `✅ User ${userId} has been ${status === 'true' ? 'blocked' : 'unblocked'}.`);
        } catch (err) {
            console.error('Error blocking user:', err.message);
            bot.sendMessage(chatId, '⚠️ Error while blocking the user.');
        }
    });
}