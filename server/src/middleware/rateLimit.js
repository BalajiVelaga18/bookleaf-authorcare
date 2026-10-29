import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

const isDev = config.env === 'development';

export const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDev ? 1000 : config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

export const loginLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDev ? 50 : config.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});
