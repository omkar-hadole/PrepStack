const mongoose = require('mongoose');

const SemesterSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

const SubjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
    createdAt: { type: Date, default: Date.now }
});
SubjectSchema.index({ semesterId: 1, name: 1 }, { unique: true });

const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    duration: { type: Number, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const QuestionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    type: {
        type: String,
        enum: ['mcq_single', 'mcq_multiple', 'integer', 'short_text'],
        required: true
    },
    text: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const AttemptSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    userId: { type: String, required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    answers: { type: Map, of: mongoose.Schema.Types.Mixed },
    score: { type: Number },
    status: { type: String, enum: ['ongoing', 'completed'], default: 'ongoing' }
});

const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true }
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: false },
    googleId: { type: String, unique: true, sparse: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    Semester: mongoose.model('Semester', SemesterSchema),
    Subject: mongoose.model('Subject', SubjectSchema),
    Quiz: mongoose.model('Quiz', QuizSchema),
    Question: mongoose.model('Question', QuestionSchema),
    Attempt: mongoose.model('Attempt', AttemptSchema),
    Admin: mongoose.model('Admin', AdminSchema),
    User: mongoose.model('User', UserSchema)
};
