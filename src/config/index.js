/**
 * Application Configuration
 * Loads environment variables and provides defaults
 */

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || ''
  },

  // Feature flags
  features: {
    validateSignature: process.env.VALIDATE_SIGNATURE !== 'false'
  }
};

module.exports = config;
