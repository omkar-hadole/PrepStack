import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { Admin, User } from '../models/index.js';
import 'dotenv/config';

import connectDB from '../db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    await connectDB();
    console.log("Admin Login route hit");
    const { username, password } = req.body;

    try {
        const admin = await Admin.findOne({ username });
        if (!admin) return res.status(400).json({ error: 'Invalid credentials' });

        const validPass = await bcrypt.compare(password, admin.passwordHash);
        if (!validPass) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ _id: admin._id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/init', async (req, res) => {
    await connectDB();
    const count = await Admin.countDocuments();
    if (count > 0) return res.status(403).json({ error: 'Admin already initialized' });

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({ username, passwordHash });
    await newAdmin.save();

    res.json({ message: 'Admin created successfully' });
});

router.post('/register', async (req, res) => {
    await connectDB();
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = new User({ name, email, passwordHash });
        await user.save();

        const token = jwt.sign({ _id: user._id, name: user.name, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/user/login', async (req, res) => {
    await connectDB();
    console.log("User Login route hit");
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        if (!user.passwordHash) return res.status(400).json({ error: 'Please login with Google.' });

        const validPass = await bcrypt.compare(password, user.passwordHash);
        if (!validPass) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ _id: user._id, name: user.name, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error("User Login Error:", err);
        res.status(500).json({ error: err.message });
    }
});

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                name: name || email.split('@')[0] || 'User',
                email,
                googleId
            });
            await user.save();
        } else if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }

        const token = jwt.sign({ _id: user._id, name: user.name, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });

    } catch (err) {
        res.status(400).json({ error: 'Google authentication failed' });
    }
});

export default router;
