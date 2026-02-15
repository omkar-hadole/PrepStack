require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Set headers for Google Auth (COOP/COEP)
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Request Logger
app.use((req, res, next) => {
    next();
});

app.use(express.static(path.join(__dirname, '../frontend')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepstack')
    .then(() => { })
    .catch(err => { });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/hierarchy'));
app.use('/api', require('./routes/questions'));
app.use('/api', require('./routes/attempts'));

// SPA Fallback: Serve index.html for any other route
app.get(/^(?!\/api).+/, (req, res) => {
    const indexPath = path.join(__dirname, '../frontend/index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(500).send('Server Error');
        }
    });
});


app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});


app.listen(PORT, () => {
});
