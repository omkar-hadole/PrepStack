import express from "express";
import serverless from "serverless-http";
import cors from 'cors';
import 'dotenv/config';

import authRoutes from "../routes/auth.js";
import hierarchyRoutes from "../routes/hierarchy.js";
import questionsRoutes from "../routes/questions.js";
import attemptRoutes from "../routes/attempts.js";
import connectDB from "../db.js";

const app = express();

app.use(cors());
app.use(express.json());

// Set headers for Google Auth (COOP/COEP)
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Connect to DB immediately
connectDB();

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api", hierarchyRoutes); // Contains /subjects, /semesters, /quizzes
app.use("/api", questionsRoutes); // Contains /quizzes/:id/questions
app.use("/api", attemptRoutes);   // Note: Check mounting point. Original app.js had /api/attempts??
// Let's check original app.js structure in memory/check.
// Original: app.use('/api', require('./routes/attempts'));
// Attempt routes start with /start, /:id/submit.
// So /api/start? Or /api/attempts/start?
// In routes/attempts.js: router.post('/start', ...).
// So if mounted at /api, it's /api/start.
// BUT, `backend/routes/attempts.js` content I just wrote matches /start.
// Let's stick to /api mount to match previous `app.js` logic which mounted everything at /api except auth at /api/auth?
// Wait, original app.js:
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api', require('./routes/hierarchy'));
// app.use('/api', require('./routes/questions'));
// app.use('/api', require('./routes/attempts'));

// So yes, mounting at /api is correct for attempts if they are /api/start.

// Test Route
app.get("/api/test", (req, res) => {
    res.json({ message: "Backend working", url: req.url });
});

app.get('/', (req, res) => {
    res.send("PrepStack Backend Running");
});

// Debug Catch-All for 404s to inspect routing
app.use((req, res) => {
    res.status(404).json({
        error: "Route not found",
        debug: {
            url: req.url,
            originalUrl: req.originalUrl,
            method: req.method,
            path: req.path,
            baseUrl: req.baseUrl
        }
    });
});

export default serverless(app);
