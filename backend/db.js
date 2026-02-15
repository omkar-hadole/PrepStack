import mongoose from 'mongoose';
import 'dotenv/config';

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000, // Fail after 5 seconds
            socketTimeoutMS: 45000,
        };

        console.log('Connecting to MongoDB...');

        cached.promise = mongoose.connect(process.env.MONGODB_URI, opts)
            .then((mongoose) => {
                console.log('MongoDB Connected Successfully');
                return mongoose;
            })
            .catch((err) => {
                console.error('MongoDB Connection Error:', err);
                throw err;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default connectDB;
