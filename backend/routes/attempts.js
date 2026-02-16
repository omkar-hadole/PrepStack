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
    try {
        const { answers } = req.body;
        const attempt = await Attempt.findById(req.params.id);
        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

        const questions = await mongoose.model('Question').find({ quizId: attempt.quizId }).lean();

        let score = 0;
        questions.forEach(q => {
            const userAns = answers[q._id.toString()];
            if (isAnswerCorrect(q, userAns)) {
                score++;
            }
        });

        attempt.endTime = new Date();
        attempt.answers = answers;
        attempt.status = 'completed';
        attempt.score = score;
        await attempt.save();

        res.json({
            score,
            total: questions.length,
            percentage: (score / questions.length) * 100,
            completedAt: attempt.endTime
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/autosave', async (req, res) => {
    try {
        const { answers } = req.body;
        await Attempt.findByIdAndUpdate(req.params.id, { answers });
        res.json({ message: 'Saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper function for scoring
function isAnswerCorrect(q, userAns) {
    if (userAns === undefined || userAns === null) return false;
    if (q.type === 'mcq_single') return String(userAns) === String(q.correctAnswer[0]);
    if (q.type === 'mcq_multiple') {
        const u = Array.isArray(userAns) ? userAns : [userAns];
        const c = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        return JSON.stringify(u.map(String).sort()) === JSON.stringify(c.map(String).sort());
    }
    if (q.type === 'integer') return Number(userAns) === Number(q.correctAnswer[0]);
    if (q.type === 'short_text') return String(userAns).trim().toLowerCase() === String(q.correctAnswer[0]).trim().toLowerCase();
    return false;
}


router.get('/:id', async (req, res) => {
    try {
        const attempt = await Attempt.findById(req.params.id).populate('quizId').lean();
        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

        const questions = await mongoose.model('Question').find({ quizId: attempt.quizId._id }).sort({ order: 1 }).lean();

        // Attach user answers to questions for the frontend
        const questionsWithAnswers = questions.map(q => ({
            ...q,
            userAnswer: (attempt.answers || {})[q._id.toString()]
        }));

        res.json({
            ...attempt,
            questions: questionsWithAnswers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/history/:userId', async (req, res) => {
    // Optimization: lean() for faster read, sort by latest first
    const attempts = await Attempt.find({ userId: req.params.userId })
        .sort({ startTime: -1 })
        .populate('quizId')
        .lean();
    res.json(attempts);
});

export default router;
