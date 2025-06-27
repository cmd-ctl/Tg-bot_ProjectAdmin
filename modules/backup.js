const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = function setup({ bot, config }) {
    const adminIds = config.adminIds;

    bot.onText(/\/backupdb/, (msg) => {
        if (!adminIds.includes(msg.from.id)) return;

        const fileName = `backup_${Date.now()}.sql`;
        const filePath = path.join(__dirname, '..', 'uploads', fileName);
        const cmd = `pg_dump -U ${config.database.user} -h ${config.database.host} -p ${config.database.port} -d ${config.database.database} > "${filePath}"`;

        exec(cmd, { env: { ...process.env, PGPASSWORD: config.database.password } }, (err) => {
            if (err) {
                bot.sendMessage(msg.chat.id, '❌ Backup failed: ' + err.message);
            } else {
                bot.sendDocument(msg.chat.id, filePath).then(() => fs.unlinkSync(filePath));
            }
        });
    });

    bot.onText(/\/restoredb/, (msg) => {
        if (!adminIds.includes(msg.from.id)) return;
        bot.sendMessage(msg.chat.id, '📥 Please send the SQL dump file for recovery.');
    });

    bot.on('document', (msg) => {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        if (!adminIds.includes(userId)) return;

        const fileName = msg.document.file_name;
        if (!fileName.endsWith('.sql')) return;

        bot.getFileLink(msg.document.file_id).then(fileUrl => {
            const https = require('https');
            const filePath = path.join(__dirname, '..', 'uploads', fileName);
            const fileStream = fs.createWriteStream(filePath);

            https.get(fileUrl, (res) => {
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();

                    const cmd = `psql -U ${config.database.user} -h ${config.database.host} -p ${config.database.port} -d ${config.database.database} < "${filePath}"`;

                    exec(cmd, { env: { ...process.env, PGPASSWORD: config.database.password } }, (err) => {
                        if (err) {
                            bot.sendMessage(chatId, '❌ Restore failed: ' + err.message);
                        } else {
                            bot.sendMessage(chatId, '✅ Database restored successfully.');
                        }
                        fs.unlinkSync(filePath);
                    });
                });
            });
        });
    });
};