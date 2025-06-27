# Admin Bot — Telegram Project Management Bot

**Admin Bot** is a modular Telegram bot designed for project administrators. It provides a range of powerful tools to manage users, statistics, scheduled commands, and system diagnostics — all through Telegram.

---

## Features

- User and referral statistics
- Save and execute SQL queries (PostgreSQL + SQLite)
- Schedule recurring bot commands
- Dynamic module hot-reloading
- Manage bot configuration and module files
- View server system info (CPU, memory, uptime)

---

## Project Structure

```
admin-bot.js               # Main bot launcher
modules/
- admins.js                # Admin permission management
- backup.js                # Backup-related logic
- query.js                 # SQL query management
- schedule.js              # Command scheduler
- stats.js                 # Statistics: DAU, WAU, MAU
- sysinfo.js               # System info (uptime, CPU, RAM)
- users.js                 # Block/unblock users
```



### 2. Install dependencies

```bash
npm install
```

### 3. Create a configuration file

Create a file named `config.example.json` with the following structure:

```json
{
  "token": "YOUR_TELEGRAM_BOT_TOKEN",
  "adminIds": [123456789],
  "database": {
    "user": "postgres",
    "password": "password",
    "host": "localhost",
    "port": 5432,
    "database": "your_db"
  },
  "sqlite": {
    "path": "./queries.db"
  }
}
```

> ⚠️ Do not commit real `config.json` or `.env` files. Use `config.example.json` as a reference.

### 4. Run the bot

```bash
node admin-bot.js
```

---

## 💬 Bot Commands

### ⚙️ Settings & Modules

* `/getsettings` — Download current `config.json`
* `/newsettings` — Upload new `config.json`
* `/getmodules` — Download all `.js` modules
* `/addmodule` — Upload or replace a `.js` module
* `/listmodules` — Show currently loaded modules

### Statistics

* `/activity` — Show DAU, WAU, MAU
* `/statfind week|month N` — Top active users
* `/channels` — Users by channel sources
* `/channeldata <source>` — Users by referral source

### SQL Queries

* `/query <SQL>` — Execute custom SQL
* `/querysave <name> <SQL>` — Save SQL query
* `/querylist` — List saved queries
* `/queryrun` — Select and run a saved query

### Scheduler

* `/schedule <name> <minutes> <chatId> <command>` — Schedule command to run periodically
* `/unschedule` — Show buttons to remove scheduled task
* `/schedulelist` — Show all active scheduled tasks

### User Management

* `/block <userId> true|false` — Block or unblock a user

### System

* `/sysinfo` — Server uptime, memory, CPU load

---

## Dependencies

* `node-telegram-bot-api`
* `dotenv`
* `pg`
* `sqlite3`
* `archiver`
* `pretty-ms`
* `node-schedule`
* `dayjs`

Install all at once:

```bash
npm install
```

---

## Creating a Module

Each module is a JS file in the `modules/` folder. It must export a function:

```
module.exports = function ({ bot, config, db, logger }) {
  bot.onText(/\/mycommand/, (msg) => {
    // your logic here
  });
};
```

Modules are auto-loaded and hot-reloaded on change.

---

## Access Control

Only users listed in `adminIds` can interact with the bot. All admin commands check the user ID before execution.

---

## Tips

* Use SQLite for fast local query storage.
* Use PostgreSQL for primary user/statistics data.
* Use `/help` inside the bot to get a dynamic command list.

---

