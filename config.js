const fs = require('fs');
const path = require('path');

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  const defaults = {
    port: 3001,
    session: { secret: 'easymoney-default-secret' },
    google: { clientID: '', clientSecret: '', callbackURL: '' }
  };

  let fileConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn('config.json mal formatado, usando padrões');
    }
  }

  const config = {
    port: parseInt(process.env.PORT, 10) || fileConfig.port || defaults.port,
    session: {
      secret: process.env.SESSION_SECRET || fileConfig.session?.secret || defaults.session.secret
    },
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID || fileConfig.google?.clientID || defaults.google.clientID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || fileConfig.google?.clientSecret || defaults.google.clientSecret,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || fileConfig.google?.callbackURL || defaults.google.callbackURL
    }
  };

  if (!config.google.clientID || !config.google.clientSecret) {
    console.warn('Google OAuth não configurado. Acesse https://console.cloud.google.com/ para criar suas credenciais.');
  }

  return config;
}

module.exports = loadConfig();
