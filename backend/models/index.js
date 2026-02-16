import mongoose from 'mongoose';

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
QuizSchema.index({ subjectId: 1, isActive: 1 });

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
QuestionSchema.index({ quizId: 1, order: 1 });

const AttemptSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    userId: { type: String, required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    answers: { type: Map, of: mongoose.Schema.Types.Mixed },
    score: { type: Number },
    status: { type: String, enum: ['ongoing', 'completed'], default: 'ongoing' }
});
AttemptSchema.index({ userId: 1, quizId: 1 }); // For history lookups
AttemptSchema.index({ quizId: 1 }); // For analytics

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
UserSchema.index({ email: 1 });

export const Semester = mongoose.model('Semester', SemesterSchema);
export const Subject = mongoose.model('Subject', SubjectSchema);
export const Quiz = mongoose.model('Quiz', QuizSchema);
export const Question = mongoose.model('Question', QuestionSchema);
export const Attempt = mongoose.model('Attempt', AttemptSchema);
export const Admin = mongoose.model('Admin', AdminSchema);
export const User = mongoose.model('User', UserSchema);

export default {
    Semester,
    Subject,
    Quiz,
    Question,
    Attempt,
    Admin,
    User
};
