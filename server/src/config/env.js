require('dotenv').config();

const required = ['MONGO_URI', 'JWT_SECRET'];
const isTest = process.env.NODE_ENV === 'test';

if (!isTest) {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    // Fail fast so a misconfigured deploy never starts silently
    console.error(`Missing required env variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'test-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 5,
};
