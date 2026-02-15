const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const { Question, Quiz } = require('../models');
const auth = require('../middleware/auth');
const { parseAndValidate } = require('../services/questionImportService');


router.post('/questions/import', auth, async (req, res) => {
    try {
        const { quizId, questions } = req.body;

        if (!quizId) return res.status(400).json({ error: 'quizId is required' });

        const report = parseAndValidate(questions);

        if (req.query.preview === 'true') {
            return res.json({
                success: true,
                preview: true,
                validCount: report.validQuestions.length,
                errorCount: report.errors.length,
                report
            });
        }

        if (report.errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed. Please fix errors before saving.',
                report
            });
        }

        const questionsToSave = report.validQuestions.map(q => ({
            ...q,
            quizId
        }));

        if (req.query.replace === 'true') {
            await Question.deleteMany({ quizId: new mongoose.Types.ObjectId(quizId) });
        }

        await Question.insertMany(questionsToSave);

        res.json({
            success: true,
            message: `Imported ${questionsToSave.length} questions successfully.`
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.get('/questions', async (req, res) => {
    try {
        const { quizId } = req.query;
        if (!quizId) return res.status(400).json({ error: 'quizId is required' });

        const questions = await Question.find({ quizId }).sort({ order: 1 });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/questions/:id', auth, async (req, res) => {
    try {
        const { text, options, correctAnswer, type, order } = req.body;

        const updated = await Question.findByIdAndUpdate(
            req.params.id,
            { text, options, correctAnswer, type, order },
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/questions/:id', auth, async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
