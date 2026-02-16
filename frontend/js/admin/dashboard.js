import api from '/js/utils/api.js';

export default async function renderDashboard(params, root) {
    if (!localStorage.getItem('adminToken')) {
        window.router.navigate('/admin');
        return;
    }

    root.innerHTML = `
        <div class="container mt-4">
            <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1>Admin Dashboard</h1>
                <button id="logout-btn" class="btn btn-secondary">Logout</button>
            </header>

            <div style="display: flex; gap: 2rem;">
                <nav style="width: 200px; flex-shrink: 0;">
                    <ul style="list-style: none;">
                        <li class="mb-4"><button class="btn btn-secondary" style="width: 100%" onclick="window.router.navigate('/admin/dashboard?view=semesters')">Semesters</button></li>
                        <li class="mb-4"><button class="btn btn-secondary" style="width: 100%" onclick="window.router.navigate('/admin/dashboard?view=subjects')">Subjects</button></li>
                        <li class="mb-4"><button class="btn btn-secondary" style="width: 100%" onclick="window.router.navigate('/admin/dashboard?view=quizzes')">Quizzes</button></li>
                    </ul>
                </nav>
                <main id="dashboard-content" style="flex-grow: 1;">
                    <p>Loading...</p>
                </main>
            </div>
        </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.router.navigate('/');
    });

    const view = new URLSearchParams(window.location.search).get('view') || 'semesters';
    loadView(view);
}

async function loadView(view) {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = 'Loading...';

    try {
        if (view === 'semesters') await renderSemesters(container);
        else if (view === 'subjects') await renderSubjects(container);
        else if (view === 'quizzes') await renderQuizzes(container);
    } catch (err) {
        container.innerHTML = `<p style="color:red">Error loading view: ${err.message}</p>`;
    }
}


async function renderSemesters(container) {
    const semesters = await api.get('/semesters');

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
            <h2>Semesters</h2>
            <button id="add-sem-btn" class="btn btn-primary">Add Semester</button>
        </div>
        <div id="create-sem-form" class="card mb-4" style="display: none;">
            <form id="sem-form">
                 <input type="text" name="name" placeholder="Name" required class="input-field">
                 <input type="text" name="slug" placeholder="Slug" required class="input-field">
                 <button type="submit" class="btn btn-primary">Save</button>
                 <button type="button" id="cancel-sem-btn" class="btn btn-secondary">Cancel</button>
            </form>
        </div>
        <ul class="list-group">
            ${semesters.map(s => `
                <li class="card mb-4" style="padding: 1rem;">
                    <strong>${s.name}</strong> <small>(${s.slug})</small>
                </li>`).join('')}
        </ul>
    `;

    document.getElementById('add-sem-btn').onclick = () => document.getElementById('create-sem-form').style.display = 'block';
    document.getElementById('cancel-sem-btn').onclick = () => document.getElementById('create-sem-form').style.display = 'none';

    document.getElementById('sem-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        await api.post('/semesters', data);
        loadView('semesters');
    };
}


async function renderSubjects(container) {
    const [allSemesters] = await Promise.all([
        api.get('/semesters')
    ]);

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2>Subjects</h2>
            <button id="add-sub-btn" class="btn btn-primary">Add Subject</button>
        </div>

        <!-- Filters -->
        <div class="card mb-4" style="padding: 1rem; background: #f8fafc;">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <select id="sub-filter-semester" class="input-field" style="padding: 0.5rem;">
                    <option value="">All Semesters</option>
                    ${allSemesters.map(s => `<option value="${s._id}">${s.name}</option>`).join('')}
                </select>
                <input type="text" id="sub-filter-search" placeholder="Search subjects..." class="input-field" style="padding: 0.5rem; flex-grow: 1;">
                <button id="sub-apply-filters-btn" class="btn btn-secondary">Search</button>
            </div>
        </div>

         <div id="create-sub-form" class="card mb-4" style="display: none; background: #ffffff; border: 1px solid #cbd5e1; margin-bottom: 2rem;">
            <h4 class="mb-3">Add New Subject</h4>
            <form id="sub-form">
                 <select name="semesterId" required style="padding:0.5rem; width: 100%; margin-bottom: 1rem;" class="input-field">
                    <option value="">Select Semester</option>
                    ${allSemesters.map(s => `<option value="${s._id}">${s.name}</option>`).join('')}
                 </select>
                 <input type="text" name="name" placeholder="Name" required class="input-field mb-3" style="width: 100%;">
                 <input type="text" name="slug" placeholder="Slug" required class="input-field mb-3" style="width: 100%;">
                 <button type="submit" class="btn btn-primary">Save</button>
                 <button type="button" id="cancel-sub-btn" class="btn btn-secondary">Cancel</button>
            </form>
        </div>

        <div id="subjects-list-container">
            <p>Loading subjects...</p>
        </div>
        
        <div id="sub-pagination-controls" style="display: flex; justify-content: center; gap: 1rem; margin-top: 1rem; align-items: center;"></div>
    `;

    document.getElementById('add-sub-btn').onclick = () => document.getElementById('create-sub-form').style.display = 'block';
    document.getElementById('cancel-sub-btn').onclick = () => document.getElementById('create-sub-form').style.display = 'none';

    document.getElementById('sub-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        await api.post('/subjects', data);
        e.target.reset();
        document.getElementById('create-sub-form').style.display = 'none';
        updateList();
    };

    // Filter Logic
    let currentPage = 1;
    const filterSemester = document.getElementById('sub-filter-semester');
    const filterSearch = document.getElementById('sub-filter-search');

    const updateList = async () => {
        const listContainer = document.getElementById('subjects-list-container');
        listContainer.innerHTML = '<p>Loading...</p>';

        const params = new URLSearchParams({
            page: currentPage,
            limit: 10
        });

        if (filterSemester.value) params.append('semesterId', filterSemester.value);
        if (filterSearch.value) params.append('search', filterSearch.value);

        try {
            const res = await api.get(`/subjects?${params.toString()}`);
            const { subjects, totalPages } = res;

            if (subjects.length === 0) {
                listContainer.innerHTML = '<p>No subjects found.</p>';
                document.getElementById('sub-pagination-controls').innerHTML = '';
                return;
            }

            listContainer.innerHTML = `
                <ul class="list-group">
                    ${subjects.map(s => `
                        <li class="card mb-4" style="padding: 1rem;">
                            <strong>${s.name}</strong> 
                            <small>(${allSemesters.find(sem => sem._id === s.semesterId)?.name || 'Unknown Sem'})</small>
                            <br/><span class="text-muted" style="font-size:0.8rem">${s.slug}</span>
                        </li>`).join('')}
                </ul>
            `;

            // Render Pagination
            document.getElementById('sub-pagination-controls').innerHTML = `
                <button class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''} id="sub-prev-btn">Previous</button>
                <span>Page ${currentPage} of ${totalPages}</span>
                <button class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} id="sub-next-btn">Next</button>
            `;

            document.getElementById('sub-prev-btn').onclick = () => {
                if (currentPage > 1) {
                    currentPage--;
                    updateList();
                }
            };
            document.getElementById('sub-next-btn').onclick = () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    updateList();
                }
            };

        } catch (err) {
            listContainer.innerHTML = `<p style="color:red">Error loading subjects: ${err.message}</p>`;
        }
    };

    document.getElementById('sub-apply-filters-btn').onclick = () => {
        currentPage = 1;
        updateList();
    };

    filterSearch.onkeypress = (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            updateList();
        }
    };

    // Initial Load
    updateList();
}




async function renderQuizzes(container) {
    const [allSubjects, allSemesters] = await Promise.all([
        api.get('/subjects'),
        api.get('/semesters')
    ]);

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2>Quizzes</h2>
            <div>
                <button id="import-quiz-btn" class="btn btn-secondary">Import Quiz JSON</button>
                <button id="add-quiz-btn" class="btn btn-primary">Add Quiz</button>
            </div>
        </div>

        <!-- Filters -->
        <div class="card mb-4" style="padding: 1rem; background: #f8fafc;">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <select id="filter-semester" class="input-field" style="padding: 0.5rem;">
                    <option value="">All Semesters</option>
                    ${allSemesters.map(s => `<option value="${s._id}">${s.name}</option>`).join('')}
                </select>
                <select id="filter-subject" class="input-field" style="padding: 0.5rem;">
                    <option value="">All Subjects</option>
                    ${allSubjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('')}
                </select>
                <input type="text" id="filter-search" placeholder="Search by title..." class="input-field" style="padding: 0.5rem; flex-grow: 1;">
                <button id="apply-filters-btn" class="btn btn-secondary">Search</button>
            </div>
        </div>

        <!-- Forms (Hidden by default, now below filters) -->
         <div id="import-quiz-form" class="card mb-4" style="display: none; background: #ffffff; border: 1px solid #cbd5e1; margin-bottom: 2rem;">
            <h4 class="mb-3">Import Full Quiz (JSON)</h4>
            <p class="text-muted text-sm mb-4">Select Semester and Subject, then paste your JSON.</p>
            <form id="quiz-import-form">
                 <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <select id="import-semester" class="input-field" style="padding:0.5rem; width: 50%;">
                        <option value="">Select Semester</option>
                        ${allSemesters.map(s => `<option value="${s._id}">${s.name}</option>`).join('')}
                    </select>
                    <select name="subjectId" id="import-subject" required class="input-field" style="padding:0.5rem; width: 50%;">
                        <option value="">Select Subject</option>
                        <!-- Populated by JS -->
                    </select>
                 </div>
                 <textarea id="quiz-json-text" class="input-field" rows="10" placeholder='{ "title": "Example", ... }' required style="width: 100%; font-family: monospace; font-size: 0.9rem; margin-bottom: 1rem;"></textarea>
                 <br>
                 <button type="submit" class="btn btn-primary">Import Quiz</button>
                 <button type="button" id="cancel-import-btn" class="btn btn-secondary">Cancel</button>
            </form>
        </div>

         <div id="create-quiz-form" class="card mb-4" style="display: none; background: #ffffff; border: 1px solid #cbd5e1; margin-bottom: 2rem;">
            <h4 class="mb-3">Create New Quiz</h4>
            <form id="quiz-form">
                 <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <select id="create-semester" class="input-field" style="padding:0.5rem; width: 50%;">
                        <option value="">Select Semester</option>
                        ${allSemesters.map(s => `<option value="${s._id}">${s.name}</option>`).join('')}
                    </select>
                    <select name="subjectId" id="create-subject" required class="input-field" style="padding:0.5rem; width: 50%;">
                        <option value="">Select Subject</option>
                        <!-- Populated by JS -->
                    </select>
                 </div>
                 <input type="text" name="title" placeholder="Title" required class="input-field mb-3" style="width: 100%;">
                 <input type="number" name="duration" placeholder="Duration (min)" required class="input-field mb-3" style="width: 100%;">
                 <button type="submit" class="btn btn-primary">Create</button>
                 <button type="button" id="cancel-quiz-btn" class="btn btn-secondary">Cancel</button>
            </form>
        </div>

        <div id="quizzes-list-container">
            <p>Loading quizzes...</p>
        </div>
        
        <div id="pagination-controls" style="display: flex; justify-content: center; gap: 1rem; margin-top: 1rem; align-items: center;"></div>
    `;

    // Cascading Select Logic Helper
    const setupCascadingSelect = (semesterSelectId, subjectSelectId) => {
        const semesterSelect = document.getElementById(semesterSelectId);
        const subjectSelect = document.getElementById(subjectSelectId);

        semesterSelect.onchange = () => {
            const semId = semesterSelect.value;
            const relevantSubjects = semId ? allSubjects.filter(s => s.semesterId === semId) : [];
            subjectSelect.innerHTML = '<option value="">Select Subject</option>' +
                relevantSubjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');

            if (!semId) {
                subjectSelect.innerHTML = '<option value="">Select Semester First</option>';
            }
        };
        // Initialize
        semesterSelect.dispatchEvent(new Event('change'));
    };

    // Setup cascading for both forms
    setupCascadingSelect('import-semester', 'import-subject');
    setupCascadingSelect('create-semester', 'create-subject');


    // Modal Event Listeners
    document.getElementById('add-quiz-btn').onclick = () => {
        document.getElementById('create-quiz-form').style.display = 'block';
        document.getElementById('import-quiz-form').style.display = 'none';
    };
    document.getElementById('cancel-quiz-btn').onclick = () => document.getElementById('create-quiz-form').style.display = 'none';

    document.getElementById('import-quiz-btn').onclick = () => {
        document.getElementById('import-quiz-form').style.display = 'block';
        document.getElementById('create-quiz-form').style.display = 'none';
    };
    document.getElementById('cancel-import-btn').onclick = () => document.getElementById('import-quiz-form').style.display = 'none';

    document.getElementById('quiz-import-form').onsubmit = async (e) => {
        e.preventDefault();
        const subjectId = e.target.elements.subjectId.value;
        const jsonText = document.getElementById('quiz-json-text').value;

        try {
            const json = JSON.parse(jsonText);
            await api.post('/quizzes/import', { subjectId, json });
            alert('Quiz Imported Successfully!');
            updateList(); // Refresh list
            e.target.reset();
            document.getElementById('import-quiz-form').style.display = 'none';
        } catch (err) {
            alert('Import Failed: ' + err.message);
        }
    };

    document.getElementById('quiz-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        await api.post('/quizzes', data);
        updateList(); // Refresh list
        e.target.reset();
        document.getElementById('create-quiz-form').style.display = 'none';
    };


    // Filter Logic
    let currentPage = 1;
    const filterSemester = document.getElementById('filter-semester');
    const filterSubject = document.getElementById('filter-subject');
    const filterSearch = document.getElementById('filter-search');

    // Update subjects when semester changes
    filterSemester.onchange = () => {
        const semId = filterSemester.value;
        // Filter subject options based on semester
        // We re-render options. If semId is empty, show all.
        const relevantSubjects = semId ? allSubjects.filter(s => s.semesterId === semId) : allSubjects;
        filterSubject.innerHTML = '<option value="">All Subjects</option>' +
            relevantSubjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
    };

    const updateList = async () => {
        const listContainer = document.getElementById('quizzes-list-container');
        listContainer.innerHTML = '<p>Loading...</p>';

        const params = new URLSearchParams({
            page: currentPage,
            limit: 10
        });

        if (filterSemester.value) params.append('semesterId', filterSemester.value);
        if (filterSubject.value) params.append('subjectId', filterSubject.value);
        if (filterSearch.value) params.append('search', filterSearch.value);

        try {
            const res = await api.get(`/quizzes?${params.toString()}`);
            // Backend now returns { quizzes, totalPages, currentPage, totalQuizzes }
            const { quizzes, totalPages } = res;

            if (quizzes.length === 0) {
                listContainer.innerHTML = '<p>No quizzes found.</p>';
                document.getElementById('pagination-controls').innerHTML = '';
                return;
            }

            listContainer.innerHTML = `
                <ul class="list-group">
                    ${quizzes.map(q => `
                        <li class="card mb-4" style="padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${q.title}</strong> 
                                <br/>
                                <small class="text-muted">
                                    ${allSubjects.find(s => s._id === q.subjectId)?.name || 'Unknown Subject'} | 
                                    ${q.duration} min | ${q.totalQuestions} Questions
                                </small>
                            </div>
                            <div>
                                <button class="btn btn-secondary" onclick="window.router.navigate('/admin/quiz/${q._id}')">Manage Questions</button>
                            </div>
                        </li>`).join('')}
                </ul>
            `;

            // Render Pagination
            document.getElementById('pagination-controls').innerHTML = `
                <button class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''} id="prev-btn">Previous</button>
                <span>Page ${currentPage} of ${totalPages}</span>
                <button class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} id="next-btn">Next</button>
            `;

            document.getElementById('prev-btn').onclick = () => {
                if (currentPage > 1) {
                    currentPage--;
                    updateList();
                }
            };
            document.getElementById('next-btn').onclick = () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    updateList();
                }
            };

        } catch (err) {
            listContainer.innerHTML = `<p style="color:red">Error loading quizzes: ${err.message}</p>`;
        }
    };

    document.getElementById('apply-filters-btn').onclick = () => {
        currentPage = 1; // Reset to page 1 on new filter
        updateList();
    };

    // Auto-search on enter
    filterSearch.onkeypress = (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            updateList();
        }
    };

    // Initial Load
    updateList();
}
