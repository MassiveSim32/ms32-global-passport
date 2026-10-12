import 'dotenv/config';

const required = {
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  DISCORD_LINK_CHANNEL_ID: process.env.DISCORD_LINK_CHANNEL_ID,
  SESSION_SECRET: process.env.SESSION_SECRET
};

console.log('=== MS32 Passport startup diagnostics ===');
for (const [name, value] of Object.entries(required)) {
  console.log(`${name}: ${value ? 'configured' : 'MISSING'}`);
}
console.log('Starting application...');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason instanceof Error ? reason.message : String(reason));
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err?.message || String(err));
});

await import('./server.js');
