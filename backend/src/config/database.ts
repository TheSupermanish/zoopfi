import mongoose from 'mongoose';

export const connectDatabase = async (uri: string): Promise<void> => {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export default mongoose;

