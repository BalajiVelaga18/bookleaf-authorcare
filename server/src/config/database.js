import mongoose from 'mongoose';
import { config } from './index.js';

let connected = false;

export async function connectDatabase() {
  if (connected) return mongoose.connection;
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is not configured. Set it in your environment or .env file.');
  }
  await mongoose.connect(config.mongoUri);
  connected = true;
  console.log('MongoDB connected');
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

export function isConnected() {
  return connected && mongoose.connection.readyState === 1;
}
