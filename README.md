# Massive Sim 32 Global Passport v0.0.3

Live Discord-connected prototype.

## Current flow
- Pilot signs in with Discord OAuth (`identify` + `guilds`).
- App verifies the pilot belongs to the Massive Sim 32 server.
- App imports Discord Scheduled Events.
- Pilot selects Join / I'm Flying.
- The Discord bot tracks voice-channel join/leave state for the event's assigned voice channel.
- After the attendance threshold, the pilot can claim the event stamp.

The bot does not record or listen to audio.

## Required server environment variables
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_REDIRECT_URI`
- `SESSION_SECRET`
- `ATTENDANCE_MINUTES` (default 30)

## Test limitation
Registrations and attendance are currently stored in server memory and are cleared when the server restarts. Add Postgres before wider public testing.
