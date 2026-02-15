const express = require('express');
const router = express.Router();
const { Semester, Subject, Quiz } = require('../models');
const auth = require('../middleware/auth');


router.get('/semesters', async (req, res) => {
    try {
        const semesters = await Semester.find().sort({ createdAt: 1 });
        res.json(semesters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/semesters', auth, async (req, res) => {
    try {
        const { name, slug } = req.body;
        const semester = new Semester({ name, slug });
        await semester.save();
        res.json(semester);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


router.get('/subjects', async (req, res) => {
    try {
        const { semesterId, search, page, limit } = req.query;
        const query = {};

        if (semesterId) {
            query.semesterId = semesterId;
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Backward compatibility: If no pagination params, return all as array
        if (!page && !limit) {
            const subjects = await Subject.find(query).sort({ name: 1 });
            return res.json(subjects);
        }

        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        const totalSubjects = await Subject.countDocuments(query);
        const totalPages = Math.ceil(totalSubjects / limitNum);

        const subjects = await Subject.find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limitNum);

        res.json({
            subjects,
            totalPages,
            currentPage: pageNum,
            totalSubjects
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/subjects', auth, async (req, res) => {
    try {
        const { name, slug, semesterId } = req.body;
        const subject = new Subject({ name, slug, semesterId });
        await subject.save();
        res.json(subject);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});




router.get('/quizzes', async (req, res) => {
    try {
        const { subjectId, userId, semesterId, search, page = 1, limit = 10, sort = 'latest' } = req.query;
        let query = {};

        if (subjectId) {
            query.subjectId = subjectId;
        }

        if (semesterId) {
            const subjects = await Subject.find({ semesterId }).select('_id');
            const subjectIds = subjects.map(s => s._id);
            // If subjectId is also provided, intersect, otherwise use all from semester
            if (query.subjectId) {
                // If specific subject requested, ensure it belongs to the semester
                if (!subjectIds.find(id => id.toString() === query.subjectId.toString())) {
                    return res.json({ quizzes: [], totalPages: 0, currentPage: 1 });
                }
            } else {
                query.subjectId = { $in: subjectIds };
            }
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const sortOrder = sort === 'oldest' ? 1 : -1;

        const skip = (page - 1) * limit;
        const totalQuizzes = await Quiz.countDocuments(query);
        const totalPages = Math.ceil(totalQuizzes / limit);

        let quizzes = await Quiz.find(query)
            .sort({ createdAt: sortOrder })
            .skip(Number(skip))
            .limit(Number(limit))
            .lean();

        const quizIds = quizzes.map(q => q._id);

        const questionCounts = await require('../models').Question.aggregate([
            { $match: { quizId: { $in: quizIds } } },
            { $group: { _id: '$quizId', count: { $sum: 1 } } }
        ]);

        const countMap = {};
        questionCounts.forEach(item => {
            countMap[item._id.toString()] = item.count;
        });

        let attempts = [];
        if (userId) {
            attempts = await require('../models').Attempt.find({
                userId,
                quizId: { $in: quizIds },
                status: 'completed'
            });
        }

        quizzes = quizzes.map(q => {
            const userAttempt = userId ? attempts.find(a => a.quizId.toString() === q._id.toString()) : null;
            return {
                ...q,
                totalQuestions: countMap[q._id.toString()] || 0,
                isAttempted: !!userAttempt,
                lastAttemptId: userAttempt ? userAttempt._id : null,
                latestScore: userAttempt ? userAttempt.score : null
            };
        });

        res.json({
            quizzes,
            totalPages,
            currentPage: Number(page),
            totalQuizzes
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/quizzes', auth, async (req, res) => {
    try {
        const { title, duration, subjectId } = req.body;
        const quiz = new Quiz({ title, duration, subjectId });
        await quiz.save();
        res.json(quiz);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/quizzes/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        res.json(quiz);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const { importQuiz } = require('../services/quizImportService');


router.post('/quizzes/import', auth, async (req, res) => {
    try {
        const { subjectId, json } = req.body;
        if (!subjectId || !json) return res.status(400).json({ error: 'Missing subjectId or json data' });

        const quiz = await importQuiz(subjectId, json);
        res.json({ success: true, quizId: quiz._id, message: 'Quiz imported successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
