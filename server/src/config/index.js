import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const requiredInProd = ['MONGODB_URI', 'JWT_SECRET', 'COOKIE_SECRET'];

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'dev-cookie-secret',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@bookleaf.test',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
  adminRegistrationKey: process.env.ADMIN_REGISTRATION_KEY || '',
  demoAuthorPassword: process.env.DEMO_AUTHOR_PASSWORD || 'Author@123',
  ai: {
    enabled: process.env.AI_ENABLED !== 'false',
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '15000', 10),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '2', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    loginMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),
  },
};

export function validateConfig() {
  if (config.env === 'production') {
    const missing = requiredInProd.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

export default config;
