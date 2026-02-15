import api from '/js/api.js';

export default async function renderQuizDetails(params, root) {
    if (!localStorage.getItem('adminToken')) {
        window.router.navigate('/admin');
        return;
    }

    const quizId = params.id;
    root.innerHTML = '<div class="container mt-4">Loading Quiz Details...</div>';

    try {
        const [questions, currentQuiz] = await Promise.all([
            api.get(`/questions?quizId=${quizId}`),
            api.get(`/quizzes/${quizId}`)
        ]);

        render(root, currentQuiz, questions, quizId);

    } catch (err) {
        root.innerHTML = `<div class="container mt-4 p-4"><p style="color:red">Error: ${err.message}</p></div>`;
    }
}

function render(root, quiz, questions, quizId) {
    root.innerHTML = `
        <div class="container mt-4">
            <header style="margin-bottom: 2rem;">
                <button class="btn btn-secondary mb-4" onclick="window.history.back()">← Back</button>
                <h1>${quiz.title}</h1>
                <p class="text-muted">Manage Questions</p>
                <button class="btn btn-outline-primary" id="edit-json-btn">Edit JSON</button>
            </header>

            <div id="json-editor-area" style="display:none; margin-bottom: 2rem;">
                <div class="card" style="border: 1px solid #e2e8f0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h3 style="margin:0;">Edit Quiz JSON</h3>
                        <div style="display:flex; gap:0.5rem;">
                             <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('json-editor-content').value)">Copy</button>
                             <button class="btn btn-sm btn-primary" id="save-json-btn">Save Changes</button>
                        </div>
                    </div>
                    <textarea id="json-editor-content" style="width:100%; height:400px; font-family:monospace; padding:0.75rem; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc; color:#334155; font-size:14px;"></textarea>
                    <p class="text-muted" style="font-size: 0.85rem; margin-top: 0.5rem;">Modify the "questions" array and click Save to update. Changes to Title/Duration here are ignored.</p>
                </div>
            </div>

            <div class="card mb-4">
                <h3>Upload Questions (JSON)</h3>
                <p class="text-muted mb-4">Upload a JSON file containing an array of questions.</p>
                
                <input type="file" id="json-file-input" accept=".json" class="mb-4">
                <button id="preview-btn" class="btn btn-primary">Preview & Validate</button>
                
                <div id="preview-area" style="display:none; margin-top: 1rem; padding: 1rem; background: #f1f5f9; border-radius: 6px;"></div>
            </div>

            <div class="card">
                <h3>Existing Questions (${questions.length})</h3>
                <ul class="list-group mt-4">
                    ${questions.length === 0 ? '<p>No questions yet.</p>' : ''}
                    ${questions.map((q, i) => `
                        <li style="padding: 1rem; border-bottom: 1px solid #eee;">
                            <div style="display:flex; justify-content:space-between;">
                                <strong>Q${q.order || i + 1}: ${q.text}</strong>
                                <div>
                                    <span class="text-muted" style="font-size: 0.8rem; margin-right: 1rem;">${q.type}</span>
                                    <button class="btn btn-secondary" onclick="deleteQuestion('${q._id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Delete</button>
                                </div>
                            </div>
                            <small class="text-muted">Answer: ${JSON.stringify(q.correctAnswer)}</small>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;


    document.getElementById('preview-btn').onclick = async () => {
        const fileInput = document.getElementById('json-file-input');
        const file = fileInput.files[0];
        if (!file) return alert('Please select a file');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target.result);
                await handlePreview(json, quizId);
            } catch (err) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    };


    window.deleteQuestion = async (id) => {
        if (!confirm('Are you sure?')) return;
        await api.delete(`/questions/${id}`);

        renderQuizDetails({ id: quizId }, root);
    };


    document.getElementById('edit-json-btn').onclick = () => {
        const editorArea = document.getElementById('json-editor-area');
        const textarea = document.getElementById('json-editor-content');

        if (editorArea.style.display === 'none') {
            const exportData = {
                title: quiz.title,
                duration: quiz.duration,
                questions: questions.map(q => ({
                    text: q.text,
                    type: q.type,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    order: q.order
                }))
            };
            textarea.value = JSON.stringify(exportData, null, 2);
            editorArea.style.display = 'block';
        } else {
            editorArea.style.display = 'none';
        }
    };

    document.getElementById('save-json-btn').onclick = async () => {
        const textarea = document.getElementById('json-editor-content');
        try {
            const json = JSON.parse(textarea.value);
            if (!Array.isArray(json.questions)) throw new Error('JSON structure invalid: missing "questions" array');

            if (confirm('This will replace ALL existing questions in this quiz. Are you sure?')) {
                await api.post('/questions/import?replace=true', {
                    quizId,
                    questions: json.questions
                });
                alert('Questions updated successfully!');
                window.location.reload();
            }
        } catch (err) {
            alert('Failed to save: ' + err.message);
        }
    };
}

async function handlePreview(jsonQuestions, quizId) {
    const previewArea = document.getElementById('preview-area');
    previewArea.style.display = 'block';
    previewArea.innerHTML = 'Validating...';

    try {
        const res = await api.post('/questions/import?preview=true', {
            quizId,
            questions: jsonQuestions
        });

        const { validCount, errorCount, report } = res;

        let html = `<h4>Validation Result</h4>`;
        html += `<p><strong>Valid:</strong> ${validCount} | <strong>Errors:</strong> ${errorCount}</p>`;

        if (errorCount > 0) {
            html += `<div style="background: #fee2e2; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <h5 style="color: #ef4444;">Errors Found:</h5>
                <ul style="max-height: 200px; overflow-y: auto;">
                    ${report.errors.map(e => `<li><strong>Index ${e.index}:</strong> ${e.message}</li>`).join('')}
                </ul>
            </div>`;
            html += `<button disabled class="btn btn-secondary">Fix Errors to Import</button>`;
        } else {
            html += `<div style="background: #dcfce7; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <h5 style="color: #10b981;">All Good!</h5>
                <p>Ready to import ${validCount} questions.</p>
            </div>`;
            html += `<button id="confirm-import-btn" class="btn btn-primary">Confirm Import</button>`;
        }

        previewArea.innerHTML = html;

        if (document.getElementById('confirm-import-btn')) {
            document.getElementById('confirm-import-btn').onclick = async () => {
                await api.post('/questions/import', {
                    quizId,
                    questions: jsonQuestions
                });
                alert('Import Successful');
                window.location.reload();
            };
        }

    } catch (err) {
        previewArea.innerHTML = `<p style="color:red">Server Error: ${err.message}</p>`;
    }
}
