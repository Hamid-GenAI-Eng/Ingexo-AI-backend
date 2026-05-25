import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';

// Subscribe to uncaught exceptions before running any imports/logic
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION! Shutting down server safely...');
  console.error(err.name, ':', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Configure env config vars
dotenv.config();

// Establish Mongoose Database connection
connectDB();

const PORT = process.env.PORT || 5000;

// Listen for HTTP requests
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in [${process.env.NODE_ENV}] mode on port ${PORT}`);
});

// Subscribe to unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('🔥 UNHANDLED PROMISE REJECTION! Shutting down server gracefully...');
  console.error(err.name, ':', err.message);
  
  // Close server listener and shutdown
  server.close(() => {
    process.exit(1);
  });
});
