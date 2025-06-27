module.exports = function ({ bot, config, pool, CHANNELS}) {

    const ADMIN_USER_IDS = config.adminIds;
    const dayjs = require('dayjs');

    bot.onText(/\/activity/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!ADMIN_USER_IDS.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ Access denied.');
        }

        try {
            const result = await pool.query(`
                SELECT
                    COUNT(DISTINCT userId) FILTER (WHERE created_at >= CURRENT_DATE) AS dau,
                    COUNT(DISTINCT userId) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '6 days') AS wau,
                    COUNT(DISTINCT userId) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '29 days') AS mau
                FROM logs;
            `);

            const { dau, wau, mau } = result.rows[0];

            const text = `📊 *User Activity Stats:*

                    👤 DAU: ${dau}
                    📆 WAU: ${wau}
                    🗓️ MAU: ${mau}`;

            bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        } catch (err) {
            console.error('/activity error:', err.message);
            bot.sendMessage(chatId, '❌ Failed to get activity stats.');
        }
    });

    bot.onText(/\/channels/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!ADMIN_USER_IDS.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ Access denied.');
        }

        try {
            const result = await pool.query(`
                SELECT referral_source, COUNT(*) AS total
                FROM users
                WHERE referral_source IS NOT NULL
                GROUP BY referral_source
                ORDER BY total DESC;
            `);

            const output = result.rows.map(r => `• ${r.referral_source || 'unknown'} — ${r.total}`).join('\n');
            bot.sendMessage(chatId, `📡 *Users by Channel:*

                ${output}`, { parse_mode: 'Markdown' });
        } catch (err) {
            console.error('/channels error:', err.message);
            bot.sendMessage(chatId, '❌ Failed to retrieve channel stats.');
        }
    });

    bot.onText(/\/channeldata (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const source = match[1];

        if (!ADMIN_USER_IDS.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ Access denied.');
        }

        try {
            const result = await pool.query(`
                SELECT userId, created_at
                FROM users
                WHERE referral_source = $1
                ORDER BY created_at DESC
                LIMIT 30;
            `, [source]);

            if (result.rows.length === 0) {
                return bot.sendMessage(chatId, '📭 No data found.');
            }

            const output = result.rows.map(r => `• ${r.userId} — ${dayjs(r.created_at).format('YYYY-MM-DD HH:mm')}`).join('\n');
            bot.sendMessage(chatId, `📦 *Last 30 users from:* ${source}

                ${output}`, { parse_mode: 'Markdown' });
        } catch (err) {
            console.error('/channeldata error:', err.message);
            bot.sendMessage(chatId, '❌ Failed to retrieve data.');
        }
    });

    bot.onText(/\/statfind (week|month) (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const type = match[1];
        const count = parseInt(match[2]);

        if (!ADMIN_USER_IDS.includes(userId)) {
            return bot.sendMessage(chatId, '⛔ Access denied.');
        }

        let interval;
        if (type === 'week') interval = '7 days';
        else if (type === 'month') interval = '30 days';
        else return bot.sendMessage(chatId, '⚠️ Use /statfind week N or /statfind month N');

        try {
            const result = await pool.query(`
                SELECT userId, COUNT(*) AS total
                FROM logs
                WHERE created_at >= NOW() - INTERVAL '${interval}'
                GROUP BY userId
                ORDER BY total DESC
                LIMIT $1;
            `, [count]);

            if (result.rows.length === 0) {
                return bot.sendMessage(chatId, '📭 No user data found.');
            }

            const text = result.rows.map((r, i) => `${i + 1}. ${r.userId} — ${r.total}`).join('\n');
            bot.sendMessage(chatId, `📈 *Top ${count} users last ${type}:*\n\n${text}`, { parse_mode: 'Markdown' });
        } catch (err) {
            console.error('/statfind error:', err.message);
            bot.sendMessage(chatId, '❌ Error fetching top users.');
        }
    });
};