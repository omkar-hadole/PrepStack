const { Quiz, Question } = require('../models');


function adaptQuestion(q) {
    let type = q.type;


    if (type === 'mcq') {
        if (Array.isArray(q.answer) && q.answer.length > 1) {
            type = 'mcq_multiple';
        } else {
            type = 'mcq_single';
        }
    } else if (type === 'text') {
        type = 'short_text';
    }


    return {
        text: q.q || q.text,
        type: type,
        options: q.options || [],
        correctAnswer: q.answer || q.correctAnswer,

    };
}


async function importQuiz(subjectId, json) {
    if (!json.title) throw new Error("Missing 'title' in JSON.");


    let duration = json.duration;
    if (duration > 100) {
        duration = Math.round(duration / 60);
    }


    const quiz = new Quiz({
        title: json.title,
        duration: duration,
        subjectId: subjectId,
        isActive: true
    });

    await quiz.save();


    if (Array.isArray(json.questions)) {
        const questionsToSave = json.questions.map((q, i) => {
            const adapted = adaptQuestion(q);
            return {
                ...adapted,
                quizId: quiz._id,
                order: i + 1
            };
        });




        await Question.insertMany(questionsToSave);
    }

    return quiz;
}

module.exports = { importQuiz };
