const serverless = require('serverless-http');
const app = require('../app');
const connectDB = require('../db');

// Ensure DB connection before handling request
const handler = async (req, res) => {
    await connectDB();
    const result = await serverless(app)(req, res);
    return result;
};

module.exports = handler;
