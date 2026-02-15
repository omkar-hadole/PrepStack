import api from '/js/api.js';

export default async function renderReview(params, root) {
    const attemptId = params.id;
    root.innerHTML = '<div class="container mt-4">Loading Review...</div>';

    try {
        const attempt = await api.get(`/attempts/${attemptId}`);

        root.innerHTML = `
            <div class="container mt-4" style="max-width: 800px;">
                <header style="display: flex; justify-content: space-between; margin-bottom: 2rem; align-items: center;">
                    <div>
                        <h2>Review Results</h2>
                        <h4 class="text-muted">Score: ${attempt.score} / ${attempt.questions.length} (${((attempt.score / attempt.questions.length) * 100).toFixed(0)}%)</h4>
                    </div>
                    <a href="/courses" class="btn btn-primary" data-link>Done</a>
                </header>
                
                <div style="display: flex; flex-direction: column; gap: 2rem; padding-bottom: 4rem;">
                    ${attempt.questions.map((q, i) => {
            const isCorrect = isAnswerCorrect(q, q.userAnswer);
            const userAnsStr = formatAnswer(q.userAnswer);
            const correctAnsStr = formatAnswer(q.correctAnswer);

            return `
                        <div class="card" style="padding: 2rem; border-left: 6px solid ${isCorrect ? '#10b981' : '#ef4444'}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            <p class="mb-4" style="font-size: 1.1rem;"><strong>Q${i + 1}:</strong> ${q.text}</p>
                            
                            <!-- Options (for MCQs) -->
                            ${q.options && q.options.length ? `
                                <ul style="list-style: none; padding-left: 0;">
                                    ${q.options.map((opt, idx) => {
                let style = 'padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid transparent; transition: all 0.2s;';

                
                const isSelected = isSelectedOption(q, q.userAnswer, idx);
                const isCorrectOpt = isSelectedOption(q, q.correctAnswer, idx);

                if (isCorrectOpt) style += 'background: #ecfdf5; color: #065f46; border-color: #34d399; font-weight: 500;';
                else if (isSelected && !isCorrectOpt) style += 'background: #fef2f2; color: #991b1b; border-color: #f87171;';
                else style += 'background: #ffffff; border-color: #e2e8f0;';

                return `<li style="${style}">
                                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                                <span style="display: flex; align-items: center; gap: 0.5rem;">
                                                    ${isSelected ?
                        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>`
                        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`
                    }
                                                    ${opt}
                                                </span>
                                                <span style="display: flex; align-items: center; gap: 0.5rem;">
                                                    ${isCorrectOpt ?
                        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                        : ''}
                                                    ${isSelected && !isCorrectOpt ?
                        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
                        : ''}
                                                </span>
                                            </div>
                                        </li>`;
            }).join('')}
                                </ul>
                            ` : ''}

                            <!-- Non-MCQ display -->
                            ${!q.options || q.options.length === 0 ? `
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; background: #f8fafc; padding: 1rem; border-radius: 8px;">
                                    <div style="color: ${isCorrect ? '#10b981' : '#ef4444'}">
                                        <strong>Your Answer:</strong><br> ${userAnsStr || '<em>Skipped</em>'}
                                    </div>
                                    <div style="color: #10b981">
                                        <strong>Correct Answer:</strong><br> ${correctAnsStr}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        root.innerHTML = `<div class="container mt-4"><p style="color:red">Error loading review: ${err.message}</p></div>`;
    }
}

function isSelectedOption(q, ans, idx) {
    if (ans === undefined || ans === null) return false;
    if (q.type === 'mcq_single') return String(ans) === String(idx);
    if (q.type === 'mcq_multiple') return Array.isArray(ans) && ans.map(String).includes(String(idx));
    return false;
}

function formatAnswer(ans) {
    if (Array.isArray(ans)) return ans.join(', ');
    return String(ans);
}

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
