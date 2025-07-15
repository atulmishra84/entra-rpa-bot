// pm2.config.js
module.exports = {
  apps: [
    {
      name: 'rpa-bot',
      script: 'dist/server.js', // or server.ts if using ts-node
      interpreter: 'node',
      cron_restart: '0 * * * *', // every hour
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log'
    }
  ]
};
