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
console.log("Initializing Backend Function...");

// Middleware
app.use(cors({
    origin: ["https://prep-stack-nst.vercel.app", "http://localhost:5173", "https://prep-stack-dyxuz9r4n-omkarhadoles-projects.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Remove restrictive COOP/COEP headers for now to fix Google Sign-In interaction
// app.use((req, res, next) => {
//     res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
//     res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
//     next();
// });

// Connect to DB immediately
connectDB();

// Mount Routes EXACTLY
app.use("/api/auth", authRoutes);
app.use("/api", hierarchyRoutes);
app.use("/api", questionsRoutes);
app.use("/api", attemptRoutes);

// Test Route
app.get("/api/test", async (req, res) => {
    await connectDB();
    res.json({ message: "Backend working", url: req.url });
});

app.get('/', (req, res) => {
    res.send("PrepStack Backend Running");
});

// Debug Catch-All
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
