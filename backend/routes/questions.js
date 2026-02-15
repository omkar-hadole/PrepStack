import express from 'express';
import { Quiz, Question, Subject } from '../models/index.js';

const router = express.Router();

router.get('/quizzes/:quizId/questions', async (req, res) => {
    try {
        const questions = await Question.find({ quizId: req.params.quizId }).sort({ order: 1 });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/quizzes/:quizId/questions', async (req, res) => {
    const { type, text, options, correctAnswer, order } = req.body;
    try {
        const question = new Question({
            quizId: req.params.quizId,
            type, text, options, correctAnswer, order
        });
        await question.save();
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/questions/:id', async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/questions/:id', async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Import JSON to Quiz
router.post('/quizzes/import', async (req, res) => {
    try {
        const { subjectId, json } = req.body;

        if (!subjectId || !json) {
            return res.status(400).json({ error: "Missing subjectId or JSON data" });
        }

        // 1. Create Quiz from JSON metadata
        const quiz = new Quiz({
            title: json.title,
            duration: json.duration || 60, // Default 60 mins if missing
            subjectId: subjectId,
            isActive: true
        });
        await quiz.save();

        // 2. Create Questions
        if (json.questions && Array.isArray(json.questions)) {
            for (const q of json.questions) {
                // Basic validation/mapping
                const type = q.type || 'mcq_single'; // Default
                const question = new Question({
                    quizId: quiz._id,
                    type: type,
                    text: q.question || q.text,
                    options: q.options || [],
                    correctAnswer: q.answer || q.correctAnswer,
                    order: q.id || 0 // Use ID as order if available
                });
                await question.save();
            }
        }

        res.json({ message: "Quiz imported successfully", quizId: quiz._id });

    } catch (err) {
        console.error("Import Error:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
