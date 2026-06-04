import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || MONGODB_URI;

  if (!uri) {
    console.error('❌ MongoDB connection error: MONGODB_URI environment variable is not defined.');
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    return;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false, // Disable Mongoose buffering when connection is lost
      serverSelectionTimeoutMS: 5000 // Fast timeout if unreachable
    }).then((m) => {
      console.log(`📡 MongoDB Connected successfully`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null; // Reset promise if connection failed
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }

  return cached.conn;
};

// Monitor mongoose connection status
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB run-time error: ${err.message}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed due to app termination');
  process.exit(0);
});
