const schedule = require('node-schedule');

module.exports = function ({ bot, config }) {
    const scheduledTasks = new Map();

    bot.onText(/\/schedule (\w+) (\d+) (-?\d+) ([\s\S]+)/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!config.adminIds.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ You do not have permission to schedule tasks.');
        }

        if (!match) {
            return bot.sendMessage(chatId, '⚠️ Invalid format. Example:\n/schedule mytask 5 -100123456789 /status');
        }

        const [_, name, minutes, targetChatId, command] = match;

        if (scheduledTasks.has(name)) {
            return bot.sendMessage(chatId, `⚠️ Task "${name}" is already scheduled.`);
        }

        const intervalMinutes = parseInt(minutes);
        if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
            return bot.sendMessage(chatId, '⚠️ Please enter a positive number of minutes.');
        }

        const job = schedule.scheduleJob(`*/${intervalMinutes} * * * *`, () => {
            const fakeMsg = {
                message_id: Date.now(),
                from: { id: userId, is_bot: false, first_name: 'Scheduler' },
                chat: { id: parseInt(targetChatId), type: 'private' },
                date: Math.floor(Date.now() / 1000),
                text: command
            };

            bot.processUpdate({ update_id: Date.now(), message: fakeMsg });
        });

        scheduledTasks.set(name, job);
        bot.sendMessage(chatId, `✅ Task "${name}" is scheduled every ${intervalMinutes} minutes in chat ${targetChatId}`);
    });

    bot.onText(/\/unschedule$/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!config.adminIds.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ You do not have permission to delete tasks.');
        }

        const tasks = Array.from(scheduledTasks.keys());

        if (tasks.length === 0) {
            return bot.sendMessage(chatId, '📭 There are no scheduled tasks.');
        }

        const inlineKeyboard = tasks.map(name => [{
            text: `🗑️ ${name}`,
            callback_data: `unschedule:${name}`
        }]);

        bot.sendMessage(chatId, 'Select a task to delete:', {
            reply_markup: { inline_keyboard: inlineKeyboard }
        });
    });

    bot.on('callback_query', (query) => {
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const data = query.data;

        if (!config.adminIds.includes(userId)) {
            return bot.answerCallbackQuery(query.id, { text: '⛔ Access denied', show_alert: true });
        }

        if (data.startsWith('unschedule:')) {
            const name = data.split(':')[1];
            const job = scheduledTasks.get(name);

            if (!job) {
                bot.answerCallbackQuery(query.id, { text: `⚠️ Task "${name}" not found.`, show_alert: true });
                return;
            }

            job.cancel();
            scheduledTasks.delete(name);

            bot.editMessageText(`🗑️ Task "${name}" was successfully canceled.`, {
                chat_id: chatId,
                message_id: query.message.message_id
            });

            bot.answerCallbackQuery(query.id, { text: `Task "${name}" has been cancelled.` });
        }
    });



    bot.onText(/\/schedulelist/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!config.adminIds.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ Access denied.');
        }

        const names = Array.from(scheduledTasks.keys());
        if (names.length === 0) {
            return bot.sendMessage(chatId, '📭 There are no scheduled tasks.');
        }

        const list = names.map(n => `• ${n}`).join('\n');
        bot.sendMessage(chatId, `📆 *Scheduled tasks:*\n\n${list}`, { parse_mode: 'Markdown' });
    });
};
