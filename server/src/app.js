import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import authRoutes from './routes/authRoutes.js';
import authorRoutes from './routes/authorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { handleSSE } from './controllers/sseController.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.cookieSecret));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// AI configuration status (safe metadata only)
app.get('/api/v1/ai-status', (req, res) => {
  res.json({
    success: true,
    enabled: config.ai.enabled && !!config.ai.apiKey,
    model: config.ai.model,
  });
});

// SSE endpoint
app.get('/api/sse/events', handleSSE);

// API routes
app.use('/api/v1/auth', globalLimiter, authRoutes);
app.use('/api/v1/author', globalLimiter, authorRoutes);
app.use('/api/v1/admin', globalLimiter, adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
