import dotenv from 'dotenv';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

// Configure env vars
dotenv.config();

// Connect to Database (Mongoose handles buffering queries automatically)
connectDB();

export default app;
