# Railway deployment

This bot is ready to run on Railway with the Node.js service detector.

## Start command

Railway can use the npm start script:

```sh
npm start
```

## Environment variables

Set these in Railway. Do not commit real values to GitHub.

```sh
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_guild_id
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-nano
AI_REPLY_CHANCE=0.08
AI_REPLY_COOLDOWN_MS=600000
WORLD_CUP_SUPABASE_URL=https://pagoqdpzbxpckhpqjoif.supabase.co
WORLD_CUP_SUPABASE_ANON_KEY=your_public_supabase_anon_key
WORLD_CUP_TOURNAMENT_SLUG=world-cup-2026
AUTOMODE_CHECK_INTERVAL_MS=120000
```

For persistent SQLite storage, add a Railway volume and set:

```sh
DATABASE_PATH=/data/database.sqlite
```

If no volume is mounted, the bot will still start, but SQLite data can be lost when Railway rebuilds or moves the service.

## Slash commands

After setting `TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID`, deploy slash commands with:

```sh
npm run deploy:commands
```

Use `GUILD_ID` for fast guild-specific command updates. Leave it unset for global Discord commands, which can take longer to propagate.
