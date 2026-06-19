import mongoose from 'mongoose';

/**
 * Serverless-safe Mongoose connection. Vercel reuses warm function instances,
 * so we cache the connection on `global` to avoid opening a new one (and
 * exhausting Atlas connection limits) on every invocation.
 */
const MONGODB_URI = process.env.MONGODB_URI || '';

interface Cache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}
const g = global as unknown as { _mongoose?: Cache };
const cached: Cache = g._mongoose || (g._mongoose = { conn: null, promise: null });

/** True when a Mongo connection string is configured (real backend available). */
export const dbConfigured = (): boolean => !!MONGODB_URI;

/** Connect (or reuse a cached connection). Throws if MONGODB_URI is unset. */
export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set — configure it to enable the database.');
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
