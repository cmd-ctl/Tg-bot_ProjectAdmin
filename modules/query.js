module.exports = function ({ bot, db, config }) {
    const path = require('path');
    const fs = require('fs');
    const pool = db.pg;
    const savedDb = db.sqlite;
    const ADMIN_USER_IDS = config.adminIds;

    bot.onText(/\/query (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const queryText = match[1];

        if (!ADMIN_USER_IDS.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ You do not have permission to use this command.');
        }

        if (msg.chat.type !== 'private') {
            return bot.sendMessage(chatId, '⚠️ This command can only be used in private chat.');
        }

        try {
            const result = await pool.query(queryText);

            if (result.rows.length === 0) {
                return bot.sendMessage(chatId, '✅ Query executed. No results.');
            }

            const output = result.rows.map((row, i) => `${i + 1}. ${JSON.stringify(row)}`).join('\n');

            if (result.rows.length > 20 || output.length > 3500) {
                const filename = `query_result_${Date.now()}.txt`;
                const filePath = path.join(__dirname, filename);
                fs.writeFileSync(filePath, output);

                await bot.sendDocument(chatId, filePath, {}, {
                    filename: 'query_result.txt',
                    contentType: 'text/plain'
                });

                fs.unlink(filePath, () => {});
            } else {
                await bot.sendMessage(chatId, `📄 *Query result:*\n\`\`\`\n${output}\n\`\`\``, {
                    parse_mode: 'Markdown'
                });
            }
        } catch (err) {
            console.error('/query error:', err.message);
            bot.sendMessage(chatId, `❌ Query error:\n${err.message}`);
        }
    });

    bot.onText(/\/querysave (\w+)\s+([\s\S]+)/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const name = match[1];
        const query = match[2];

        if (!ADMIN_USER_IDS.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ Access denied.');
        }

        savedDb.run(
            `INSERT OR REPLACE INTO queries (name, query) VALUES (?, ?)`,
            [name, query],
            (err) => {
                if (err) {
                    console.error('Query save error:', err.message);
                    return bot.sendMessage(chatId, '❌ Failed to save query.');
                }
                bot.sendMessage(chatId, `✅ Query "${name}" has been saved.`);
            }
        );
    });

    bot.onText(/\/queryrun$/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!ADMIN_USER_IDS.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ Access denied.');
        }

        savedDb.all(`SELECT name FROM queries ORDER BY name`, [], (err, rows) => {
            if (err) {
                console.error('Error loading saved queries:', err.message);
                return bot.sendMessage(chatId, '❌ Failed to load saved queries.');
            }

            if (rows.length === 0) {
                return bot.sendMessage(chatId, '📭 No saved queries found.');
            }

            const inlineKeyboard = rows.map(row => [{ text: row.name, callback_data: `queryrun:${row.name}` }]);
            bot.sendMessage(chatId, '📌 Choose a saved query to run:', {
                reply_markup: {
                    inline_keyboard: inlineKeyboard
                }
            });
        });
    });

    bot.on('callback_query', async (callbackQuery) => {
        const msg = callbackQuery.message;
        const userId = callbackQuery.from.id;
        const chatId = msg.chat.id;

        if (!ADMIN_USER_IDS.includes(userId)) {
            return bot.answerCallbackQuery(callbackQuery.id, { text: '⛔ Access denied.', show_alert: true });
        }

        if (callbackQuery.data.startsWith('queryrun:')) {
            const name = callbackQuery.data.split(':')[1];

            savedDb.get(`SELECT query FROM queries WHERE name = ?`, [name], async (err, row) => {
                if (err || !row) {
                    return bot.sendMessage(chatId, '⚠️ Query not found.');
                }

                try {
                    const output = await pool.query(row.query);

                    if (output.rows.length === 0) {
                        return bot.sendMessage(chatId, `✅ Query "${name}" executed. No results.`);
                    }

                    const text = output.rows.map((r, i) => `${i + 1}. ${JSON.stringify(r)}`).join('\n');

                    if (output.rows.length > 20 || text.length > 3500) {
                        const filename = `saved_query_result_${Date.now()}.txt`;
                        const filePath = path.join(__dirname, filename);
                        fs.writeFileSync(filePath, text);

                        await bot.sendDocument(chatId, filePath, {}, {
                            filename: 'query_result.txt',
                            contentType: 'text/plain'
                        });

                        fs.unlink(filePath, () => {});
                    } else {
                        bot.sendMessage(chatId, `📥 Result of "${name}":\n\`\`\`\n${text}\n\`\`\``, {
                            parse_mode: 'Markdown'
                        });
                    }
                } catch (err) {
                    console.error('Error running query:', err.message);
                    bot.sendMessage(chatId, `❌ Error executing query "${name}".`);
                }
            });
        }
    });

    bot.onText(/\/querylist/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!ADMIN_USER_IDS.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ Access denied.');
        }

        savedDb.all(`SELECT name FROM queries ORDER BY name`, [], (err, rows) => {
            if (err) {
                console.error('List retrieval error:', err.message);
                return bot.sendMessage(chatId, '❌ Failed to retrieve list.');
            }

            if (rows.length === 0) {
                return bot.sendMessage(chatId, '📭 No saved queries found.');
            }

            const names = rows.map(r => `• ${r.name}`).join('\n');
            bot.sendMessage(chatId, `📋 *Saved queries:*\n\n${names}`, { parse_mode: 'Markdown' });
        });
    });
};
