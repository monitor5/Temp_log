import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.MONGO_URI, {serverSelectionTimeoutMS: 5000, socketTimeoutMS: 10000, maxPoolSize: 10});
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection failed');
    throw error;
  }
};

// 연결 이벤트 리스너
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err.name);
});

