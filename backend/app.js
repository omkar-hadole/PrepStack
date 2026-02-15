require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');

const app = express();

// Middleware
app.use(cors());
// Only start server if run directly (local dev)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }).catch(err => {
        console.error('Database connection failed', err);
        process.exit(1);
    });
}
app.use(express.json());

// Set headers for Google Auth (COOP/COEP)
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); // Note: 'credentialless' might be better for some OAuth flows
    next();
});

// Connect to Database
// In serverless, we call this inside the handler, but for local dev/app.js structure:
connectDB().catch(console.error);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/hierarchy'));
app.use('/api', require('./routes/questions'));
app.use('/api', require('./routes/attempts'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

module.exports = app;
