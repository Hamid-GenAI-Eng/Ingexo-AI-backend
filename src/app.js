import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import apiRouter from './routes/index.js';
import globalErrorHandler from './middlewares/error.middleware.js';
import AppError from './utils/AppError.js';
import { connectDB } from './config/db.js';

const app = express();

// 1. GLOBAL MIDDLEWARES
// Security headers
app.use(helmet());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS settings - Allow incoming credentials/cookies safely
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parser with payload limit safeguards
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser for reading secure auth state tokens
app.use(cookieParser());

// Rate limiting to protect endpoints against brute force / DDOS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});
// Database connection middleware for Serverless Environments (Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api', limiter);

// 2. MOUNT ROUTES
app.use('/api', apiRouter);

// Root path welcome message
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Ingexo AI Enterprise API portal.',
    health: '/api/health',
    timestamp: new Date()
  });
});

// 3. UNHANDLED ROUTES FALLBACK
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find requested route ${req.originalUrl} on this server`, 404));
});

// 4. CENTRAL ERROR HANDLER MIDDLEWARE
app.use(globalErrorHandler);

export default app;
