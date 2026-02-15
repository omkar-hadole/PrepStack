const express = require('express');
const router = express.Router();
const { Attempt, Quiz, Question } = require('../models');


const sanitizeQuestions = (questions) => {
    return questions.map(q => ({
        _id: q._id,
        type: q.type,
        text: q.text,
        options: q.options,
        order: q.order
    }));
};


router.get('/attempts/history/:userId', async (req, res) => {
    try {
        const attempts = await Attempt.find({ userId: req.params.userId }).sort({ startTime: -1 });
        res.json(attempts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/attempts/start', async (req, res) => {
    try {
        const { quizId, userId } = req.body;
        if (!quizId || !userId) return res.status(400).json({ error: 'Missing quizId or userId' });

        const quiz = await Quiz.findById(quizId);
        if (!quiz || !quiz.isActive) return res.status(404).json({ error: 'Quiz not found or inactive' });




        const attempt = new Attempt({
            quizId,
            userId,
            startTime: new Date(),
            answers: {},
            status: 'ongoing'
        });
        await attempt.save();


        const questions = await Question.find({ quizId }).sort({ order: 1 });


        res.json({
            attemptId: attempt._id,
            quiz: {
                title: quiz.title,
                duration: quiz.duration
            },
            startTime: attempt.startTime,
            questions: sanitizeQuestions(questions)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.put('/attempts/:id/autosave', async (req, res) => {
    try {
        const { answers } = req.body;
        const attempt = await Attempt.findById(req.params.id);

        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
        if (attempt.status !== 'ongoing') return res.status(400).json({ error: 'Attempt is closed' });


        if (answers) {
            attempt.answers = { ...attempt.answers, ...answers };
            attempt.markModified('answers');
        }

        await attempt.save();
        res.json({ success: true, savedAt: new Date() });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/attempts/:id/submit', async (req, res) => {
    try {
        const attempt = await Attempt.findById(req.params.id);
        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

        if (attempt.status === 'completed') {
            return res.json({ message: 'Already submitted', score: attempt.score });
        }

        const { answers } = req.body;


        const quiz = await Quiz.findById(attempt.quizId);
        const questions = await Question.find({ quizId: attempt.quizId });



        const now = new Date();
        const startTime = new Date(attempt.startTime);
        const maxDurationMs = quiz.duration * 60 * 1000;
        const timeTaken = now - startTime;








        const finalAnswers = { ...(attempt.answers instanceof Map ? Object.fromEntries(attempt.answers) : attempt.answers), ...answers };


        let score = 0;
        let total = questions.length;

        questions.forEach(q => {
            const userAns = finalAnswers[q._id.toString()];

            if (userAns === undefined || userAns === null) return;

            let isCorrect = false;

            if (q.type === 'mcq_single') {
                isCorrect = String(q.correctAnswer[0]) === String(userAns);
            } else if (q.type === 'mcq_multiple') {
                if (Array.isArray(userAns)) {
                    const correctSet = new Set(q.correctAnswer.map(String));
                    const userSet = new Set(userAns.map(String));
                    if (correctSet.size === userSet.size) {
                        isCorrect = [...correctSet].every(val => userSet.has(val));
                    }
                }
            } else if (q.type === 'integer') {
                isCorrect = Number(userAns) === Number(q.correctAnswer[0]);
            } else if (q.type === 'short_text') {
                const correct = String(q.correctAnswer[0]).trim().toLowerCase();
                const user = String(userAns).trim().toLowerCase();
                isCorrect = correct === user;
            }

            if (isCorrect) score++;
        });


        attempt.answers = finalAnswers;
        attempt.endTime = now;
        attempt.score = score;
        attempt.status = 'completed';

        await attempt.save();

        res.json({
            success: true,
            score,
            total,
            percentage: (score / total) * 100,
            completedAt: now
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



router.get('/attempts/:id', async (req, res) => {
    try {
        const attempt = await Attempt.findById(req.params.id);
        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

        const response = { ...attempt.toObject() };


        if (attempt.status === 'completed') {
            const questions = await Question.find({ quizId: attempt.quizId }).sort({ order: 1 });
            response.questions = questions.map(q => ({
                _id: q._id,
                text: q.text,
                type: q.type,
                options: q.options,
                correctAnswer: q.correctAnswer,
                userAnswer: attempt.answers[q._id] || attempt.answers.get(q._id.toString())
            }));
        }

        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



module.exports = router;
