
function validateQuestion(q, index) {
    const prefix = `Question ${index + 1}:`;

    if (!q.text || typeof q.text !== 'string') return `${prefix} Missing or invalid 'text'.`;
    if (!q.type || !['mcq_single', 'mcq_multiple', 'integer', 'short_text'].includes(q.type)) {
        return `${prefix} Invalid 'type'. Must be one of: mcq_single, mcq_multiple, integer, short_text.`;
    }


    if (q.type.startsWith('mcq')) {
        if (!Array.isArray(q.options) || q.options.length < 2) {
            return `${prefix} MCQs must have an 'options' array with at least 2 items.`;
        }
        if (!q.correctAnswer) return `${prefix} Missing 'correctAnswer'.`;

        if (q.type === 'mcq_single') {










            if (!Array.isArray(q.correctAnswer)) return `${prefix} 'correctAnswer' must be an array.`;
            if (q.correctAnswer.length !== 1) return `${prefix} 'mcq_single' must have exactly one correct answer.`;
        }

        if (q.type === 'mcq_multiple') {
            if (!Array.isArray(q.correctAnswer) || q.correctAnswer.length < 1) {
                return `${prefix} 'mcq_multiple' must have at least one correct answer.`;
            }
        }
    }


    if (q.type === 'integer' || q.type === 'short_text') {
        if (q.options && q.options.length > 0) {
            return `${prefix} 'options' should not be provided for non-MCQ types.`;
        }
        if (!q.correctAnswer) return `${prefix} Missing 'correctAnswer'.`;

        if (!Array.isArray(q.correctAnswer)) return `${prefix} 'correctAnswer' must be an array.`;
    }

    return null;
}


function parseAndValidate(jsonArray) {
    if (!Array.isArray(jsonArray)) {
        return { error: "Root element must be an array of questions." };
    }

    const validQuestions = [];
    const errors = [];

    jsonArray.forEach((q, index) => {
        const error = validateQuestion(q, index);
        if (error) {
            errors.push({ index, message: error, question: q });
        } else {

            validQuestions.push({
                text: q.text,
                type: q.type,
                options: q.options || [],
                correctAnswer: q.correctAnswer,
                order: q.order || index
            });
        }
    });

    return { validQuestions, errors };
}

module.exports = { parseAndValidate };
