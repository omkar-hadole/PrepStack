import api from '/js/api.js';

let timerInterval;
let autosaveInterval;

export default async function renderAttempt(params, root) {
    const quizId = params.id;






    const userStr = localStorage.getItem('prepstack_user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user || !user._id) {
        alert('Please log in to take the quiz.');
        window.router.navigate('/login');
        return;
    }
    const userId = user._id;

    if (!timerInterval) clearInterval(timerInterval);
    if (autosaveInterval) clearInterval(autosaveInterval);

    root.innerHTML = '<div class="container mt-4">Starting Quiz...</div>';

    try {

        const data = await api.post('/attempts/start', { quizId, userId });
        const { attemptId, quiz, questions, startTime } = data;


        renderQuizUI(root, attemptId, quiz, questions, startTime);

    } catch (err) {
        root.innerHTML = `<div class="container mt-4"><p style="color:red">Error starting quiz: ${err.message}</p></div>`;
    }
}

function renderQuizUI(root, attemptId, quizInfo, questions, startTimeStr) {

    if (!document.getElementById('quiz-styles')) {
        const link = document.createElement('link');
        link.id = 'quiz-styles';
        link.rel = 'stylesheet';
        link.href = '/css/quiz.css';
        document.head.appendChild(link);
    }


    const startTime = new Date(startTimeStr).getTime();
    const durationMs = quizInfo.duration * 60 * 1000;
    const endTime = startTime + durationMs;

    const answers = {};
    const reviewStatus = new Set();
    const visited = new Set();


    initQuizLayout(root, quizInfo, questions, answers, reviewStatus, visited);


    const updateTimer = () => {
        const now = Date.now();
        const left = endTime - now;

        if (left <= 0) {
            const el = document.getElementById('timer');
            if (el) el.textContent = "00:00:00";
            clearInterval(timerInterval);
            submitQuiz(true);
            return;
        }

        const hrs = Math.floor(left / 3600000);
        const mins = Math.floor((left % 3600000) / 60000);
        const secs = Math.floor((left % 60000) / 1000);
        const el = document.getElementById('timer');
        if (el) el.textContent = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();


    autosaveInterval = setInterval(() => {
        if (Object.keys(answers).length > 0) {
            api.put(`/attempts/${attemptId}/autosave`, { answers }).catch(console.error);
        }
    }, 10000);


    async function submitQuiz(auto = false) {
        clearInterval(timerInterval);
        clearInterval(autosaveInterval);

        if (!auto && !confirm('Are you sure you want to submit?')) {
            timerInterval = setInterval(updateTimer, 1000);
            autosaveInterval = setInterval(() => {
                if (Object.keys(answers).length > 0) {
                    api.put(`/attempts/${attemptId}/autosave`, { answers }).catch(console.error);
                }
            }, 10000);
            return;
        }

        root.innerHTML = '<div class="container mt-4">Submitting answers...</div>';
        try {
            const res = await api.post(`/attempts/${attemptId}/submit`, { answers });
            renderResult(root, res, attemptId);
        } catch (err) {
            root.innerHTML = `<div class="container margin-top"><p style="color:red">Submission Failed: ${err.message}</p> <button class="btn btn-secondary" onclick="window.location.reload()">Retry</button></div>`;
        }
    }






    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.onclick = () => submitQuiz(false);


    updateQuestionView(0, questions, answers, reviewStatus, visited);
}

function initQuizLayout(root, quizInfo, questions, answers, reviewStatus, visited) {
    root.innerHTML = `
        <div class="quiz-container">
            <!-- Header -->
            <header class="quiz-header">
                <div class="quiz-title">${quizInfo.title}</div>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div id="timer" style="font-weight: bold; font-size: 1.1rem; color: #dc2626; font-family: monospace;"></div>
                    <button id="submit-btn" class="submit-btn">Submit Quiz</button>
                </div>
            </header>

            <!-- Main -->
            <main class="quiz-main">
                <!-- Toolbar -->
                <div class="question-toolbar">
                    <div id="question-number" class="question-number"></div>
                    <div class="toolbar-actions">
                        <button class="action-btn" id="mark-btn">
                            <span id="mark-text">Mark for Review</span>
                        </button>
                        <button class="action-btn" id="clear-btn">
                            <span>Clear Selection</span>
                        </button>
                    </div>
                </div>

                <!-- Content Area -->
                <div id="question-content">
                    <div id="question-text" class="question-text"></div>
                    <div id="options-area" class="options-grid"></div>
                </div>
            </main>

            <!-- Footer -->
            <footer class="quiz-footer" style="position: relative;">
                <div class="nav-palette" id="nav-palette">
                    ${questions.map((q, i) => `<div class="palette-item" data-idx="${i}" data-qid="${q._id}">${i + 1}</div>`).join('')}
                </div>
                
                <div class="nav-controls">
                    <button id="prev-btn" class="nav-btn">← Previous</button>
                    
                    <button id="palette-toggle-btn" class="nav-btn" style="padding: 0.6rem; border-radius: 50%; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                    </button>

                    <button id="next-btn" class="nav-btn primary">Next →</button>
                </div>
            </footer>
        </div>
    `;





    const paletteItems = root.querySelectorAll('.palette-item');
    paletteItems.forEach(item => {
        item.onclick = () => {
            const idx = parseInt(item.dataset.idx);
            updateQuestionView(idx, questions, answers, reviewStatus, visited);
        };
    });


    const paletteToggleBtn = document.getElementById('palette-toggle-btn');
    const palette = document.getElementById('nav-palette');

    if (paletteToggleBtn && palette) {
        paletteToggleBtn.onclick = () => {

            if (palette.classList.contains('open')) {
                palette.classList.remove('open');

                paletteToggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
            } else {
                palette.classList.add('open');

                paletteToggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            }
        };
    }


    document.getElementById('mark-btn').onclick = () => {







    };
}


let currentIndex = 0;

function updateQuestionView(index, questions, answers, reviewStatus, visited) {
    const q = questions[index];
    const isMarked = reviewStatus.has(index);
    const currentVal = answers[q._id];


    visited.add(index);


    const root = document.querySelector('.quiz-container');
    if (root) root.dataset.currentIndex = index;


    document.getElementById('question-number').textContent = `Question ${index + 1} / ${questions.length}`;
    const markBtn = document.getElementById('mark-btn');


    const starOutline = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    const starFilled = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

    markBtn.innerHTML = isMarked ?
        `<span style="display:flex; align-items:center; gap:0.5rem;">${starFilled} Unmark</span>` :
        `<span style="display:flex; align-items:center; gap:0.5rem;">${starOutline} Mark for Review</span>`;

    markBtn.onclick = () => {
        if (reviewStatus.has(index)) reviewStatus.delete(index);
        else reviewStatus.add(index);
        updateQuestionView(index, questions, answers, reviewStatus, visited);
        updatePalette(index, answers, reviewStatus, visited);
    };

    document.getElementById('clear-btn').onclick = () => {
        delete answers[q._id];
        updateQuestionView(index, questions, answers, reviewStatus, visited);
        updatePalette(index, answers, reviewStatus, visited);
    };


    document.getElementById('question-text').textContent = q.text;
    const optionsArea = document.getElementById('options-area');
    optionsArea.innerHTML = renderOptionsHtml(q, currentVal);


    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    prevBtn.disabled = index === 0;
    prevBtn.onclick = () => {
        if (index > 0) updateQuestionView(index - 1, questions, answers, reviewStatus, visited);
    };

    nextBtn.innerHTML = index === questions.length - 1 ? 'Finish' : 'Next →';
    nextBtn.onclick = () => {
        if (index < questions.length - 1) {
            updateQuestionView(index + 1, questions, answers, reviewStatus, visited);
        } else {
            document.getElementById('submit-btn').click();
        }
    };


    bindInputs(index, q, answers, reviewStatus, () => {
        updatePalette(index, answers, reviewStatus, visited, questions);
    });


    updatePalette(index, answers, reviewStatus, visited, questions);
}

function renderOptionsHtml(q, currentVal) {
    if (q.type === 'mcq_single' || q.type === 'mcq_multiple') {
        const isMulti = q.type === 'mcq_multiple';
        const vals = isMulti ? (currentVal || []) : [currentVal];

        return q.options.map((opt, i) => {
            const isSelected = vals.map(String).includes(String(i));
            const marker = String.fromCharCode(65 + i);
            return `
                <div class="option-card ${isSelected ? 'selected' : ''}" data-val="${i}">
                    <div class="option-marker">${marker}</div>
                    <div class="option-text">${opt}</div>
                </div>
            `;
        }).join('');
    }

    if (q.type === 'integer' || q.type === 'short_text') {
        const val = currentVal || '';

        const inputType = 'text';
        return `
            <div class="input-container" style="padding: 1rem;">
                <input 
                    type="${inputType}" 
                    class="quiz-input" 
                    id="q-input-${q._id}"
                    value="${val}" 
                    placeholder="Type your answer..."
                    style="width: 100%; padding: 0.8rem; font-size: 1rem; border: 2px solid #e5e7eb; border-radius: 0.5rem;"
                />
            </div>
         `;
    }
    return '<p>Input type not optimized for new UI yet.</p>';
}

function updatePalette(index, answers, reviewStatus, visited, questions) {
    const paletteItems = document.querySelectorAll('.palette-item');
    paletteItems.forEach(item => {
        const idx = parseInt(item.dataset.idx);
        const questionId = questions[idx]._id;


        item.classList.remove('active', 'visited', 'answered', 'marked');


        if (idx === index) {
            item.classList.add('active');
        }


        if (visited.has(idx)) {
            item.classList.add('visited');
        }


        const questionAnswer = answers[questionId];
        if (questionAnswer !== undefined && questionAnswer !== null) {
            if (Array.isArray(questionAnswer)) {
                if (questionAnswer.length > 0) {
                    item.classList.add('answered');
                }
            } else if (typeof questionAnswer === 'string') {
                if (questionAnswer.trim() !== '') {
                    item.classList.add('answered');
                }
            } else {
                item.classList.add('answered');
            }
        }


        if (reviewStatus.has(idx)) {
            item.classList.add('marked');
        }
    });
}

function bindInputs(index, q, answers, reviewStatus, onChange) {

    const cards = document.querySelectorAll('.option-card');
    cards.forEach(card => {
        card.onclick = () => {
            const val = card.dataset.val;
            let newVal;

            if (q.type === 'mcq_multiple') {
                let current = answers[q._id] || [];
                if (!Array.isArray(current)) current = [current];
                if (current.map(String).includes(String(val))) {
                    newVal = current.filter(v => String(v) !== String(val));
                } else {
                    newVal = [...current, val];
                }
            } else {
                newVal = val;
            }

            answers[q._id] = newVal;


            if (q.type === 'mcq_single') {
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            } else {
                card.classList.toggle('selected');
            }



            if (onChange) onChange();
        };
    });


    const input = document.getElementById(`q-input-${q._id}`);
    if (input) {
        input.oninput = (e) => {
            answers[q._id] = e.target.value;
            const paletteItem = document.querySelector(`.palette-item[data-idx="${index}"]`);
            if (paletteItem) {
                if (e.target.value.trim() !== '') paletteItem.classList.add('answered');
                else paletteItem.classList.remove('answered');
            }
        };
    }
}

function renderResult(root, result, attemptId) {
    root.innerHTML = `
        <div class="container mt-4 text-center" style="max-width: 600px;">
            <div class="card" style="padding: 3rem;">
                <h1 style="color: ${result.percentage >= 50 ? '#10b981' : '#ef4444'}">
                    ${result.percentage.toFixed(0)}%
                </h1>
                <h3 class="mb-4">Correct Answers: ${result.score} / ${result.total}</h3>
                <p class="text-muted mb-4">Completed at ${new Date(result.completedAt).toLocaleString()}</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="review-btn" class="btn btn-secondary">Review Answers</button>
                    <a href="/courses" class="btn btn-primary" data-link>Back to Courses</a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('review-btn').onclick = () => {
        window.router.navigate(`/review/${attemptId}`);
    };
}








