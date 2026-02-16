import express from 'express';
import { Attempt } from '../models/index.js';
import mongoose from 'mongoose';

const router = express.Router();

router.post('/start', async (req, res) => {
    try {
        const { quizId, userId } = req.body;
        const attempt = new Attempt({ quizId, userId, startTime: new Date() });
        await attempt.save();

        const quiz = await mongoose.model('Quiz').findById(quizId).lean();
        const questions = await mongoose.model('Question').find({ quizId }).sort({ order: 1 }).lean();

        res.json({
            attemptId: attempt._id,
            quiz,
            questions,
            startTime: attempt.startTime
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/submit', async (req, res) => {
    const { answers } = req.body;
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    attempt.endTime = new Date();
    attempt.answers = answers;
    attempt.status = 'completed';
    // Calculate score logic here (omitted for brevity, assume implemented or separate service)
    await attempt.save();

    res.json(attempt);
});

router.get('/history/:userId', async (req, res) => {
    const attempts = await Attempt.find({ userId: req.params.userId }).populate('quizId');
    res.json(attempts);
});

export default router;
