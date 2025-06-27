require('dotenv').config();
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();

const config = require('./config.json');
const logger = console;

const db = {
    pg: new Pool(config.database),
    sqlite: new sqlite3.Database(config.sqlite.path || './queries.db')
};

const bot = new TelegramBot(config.token, { polling: true });

db.sqlite.serialize(() => {
    db.sqlite.run(`
        CREATE TABLE IF NOT EXISTS queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            query TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            logger.error('Failed to ensure queries table:', err.message);
        } else {
            logger.log('✅ Table "queries" ready.');
        }
    });
});

bot.onText(/\/start/, (msg) => {
    const userId = msg.from.id;
    if (!config.adminIds.includes(userId)) return;

    const welcome = `👋 Welcome to *Admin Bot*!

		This bot allows you to manage your project via Telegram.

    📥 *Settings*
• /getsettings — download config.json
• /newsettings — upload new config.json

    ⚙️ *Modules*
• /listmodules — show all loaded modules
• /getmodules — download all modules as ZIP
• /addmodule —  upload new or update existing module

    👤 *Admin*
• /admins — admin list
• /addadmin <userId> — add admin
• /removeadmin <userId> — remove admin

    🖥 *System*
• /sysinfo — system info

    🧠 *Help*
• /help — show help message
`;

    bot.sendMessage(msg.chat.id, welcome, { parse_mode: 'Markdown' });
});


// === Service Commands ===
bot.onText(/\/getsettings/, (msg) => {
    if (!config.adminIds.includes(msg.from.id)) return;
    bot.sendDocument(msg.chat.id, './config.json');
});

bot.on('document', (msg) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    if (!config.adminIds.includes(userId)) return;

    const fileName = msg.document.file_name;
    bot.getFileLink(msg.document.file_id).then(async (fileUrl) => {
        const https = require('https');
        const fs = require('fs');
        const path = require('path');

        const filePath = path.join(__dirname, 'uploads', fileName);
        const fileStream = fs.createWriteStream(filePath);

        https.get(fileUrl, (res) => {
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();

                if (fileName === 'config.json') {
                    fs.copyFileSync(filePath, path.join(__dirname, 'config.json'));
                    bot.sendMessage(chatId, '✅ Configuration updated. Restart bot to apply.');
                } else if (fileName.endsWith('.js')) {
                    const modPath = path.join(__dirname, 'modules', fileName);
                    fs.copyFileSync(filePath, modPath);
                    bot.sendMessage(chatId, '✅ Module uploaded/replaced: ' + fileName);
                } else {
                    bot.sendMessage(chatId, '⚠️ Unknown file type.');
                }

                fs.unlinkSync(filePath);
            });
        });
    });
});

bot.onText(/\/getmodules/, (msg) => {
    if (!config.adminIds.includes(msg.from.id)) return;

    const archiver = require('archiver');
    const fs = require('fs');
    const path = require('path');
    const archivePath = path.join(__dirname, 'modules.zip');
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
        bot.sendDocument(msg.chat.id, archivePath).then(() => {
            fs.unlinkSync(archivePath);
        });
    });

    archive.on('error', (err) => {
        bot.sendMessage(msg.chat.id, '❌ Archive error.');
    });

    archive.pipe(output);
    archive.directory(path.join(__dirname, 'modules'), false);
    archive.finalize();
});

const modulesDir = path.join(__dirname, 'modules');
const loadedModules = new Map();

function loadModule(file) {
    const filePath = path.join(modulesDir, file);
    delete require.cache[require.resolve(filePath)];
    const mod = require(filePath);
    if (typeof mod === 'function') {
        mod({ bot, db, config, logger });
        loadedModules.set(file, true);
        logger.log(`🔁 Loaded module: ${file}`);
    }
}

fs.readdirSync(modulesDir).forEach(loadModule);

// Hot reload on file change
fs.watch(modulesDir, (eventType, filename) => {
    if (filename && filename.endsWith('.js')) {
        try {
            logger.log(`♻️ Reloading ${filename}...`);
            loadModule(filename);
        } catch (err) {
            logger.error(`❌ Failed to reload ${filename}:`, err.message);
        }
    }
});


// newsettings 
bot.onText(/\/newsettings/, (msg) => {
    if (!config.adminIds.includes(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, '📤 Please submit the new `config.json` file as a document in response to this message.');
});

// addmodule
bot.onText(/\/addmodule/, (msg) => {
    if (!config.adminIds.includes(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, `📤 Please submit the module's '.js' file (e.g. 'stats.js') as a document in response to this message.\nIt will be added to /modules or replaced if it already exists.`);
});

// List loaded modules
bot.onText(/\/listmodules/, (msg) => {
    if (!config.adminIds.includes(msg.from.id)) return;

    if (loadedModules.size === 0) {
        return bot.sendMessage(msg.chat.id, '❌ No modules loaded.');
    }

    const moduleList = Array.from(loadedModules.keys())
        .map(name => `• ${name}`)
        .join('\n');

    bot.sendMessage(msg.chat.id, `📦 *Active modules:*\n\n${moduleList}`, {
        parse_mode: 'Markdown'
    });
});

// help
bot.onText(/\/help/, (msg) => {
    if (!config.adminIds.includes(msg.from.id)) return;
    const text = `🛠️ *Admin Bot — Command Help:*

		📊 *Statistics*
		• /activity — show DAU, WAU, MAU stats
		• /statfind week|month N — top users
		• /channels — users by channels
		• /channeldata <source> — users from a referral source

		💾 *SQL Queries*
		• /query <SQL> — execute SQL
		• /querysave <name> <SQL> — save query
		• /queryrun — run saved query
		• /querylist — list saved queries

		🔁 *Scheduled Commands*
		• /schedule <name> <min> <chatId> <cmd> — schedule command
		• /unschedule <name> — cancel task
		• /schedulelist — list scheduled tasks

		🧑 *User Management*
		• /block <userId> true|false — block or unblock user

		🆘 *Other*
		• /help — show this message
		`;

		
			bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
		});

logger.log('✅ Admin bot started...');