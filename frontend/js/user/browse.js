import api from '/js/utils/api.js';
import { Cache } from '/js/utils/cache.js';
import { Skeleton } from '/js/components/Skeleton.js';

const QUIZZES_PER_PAGE = 6;

export default async function renderBrowse(params, root) {
    const view = new URLSearchParams(window.location.search).get('view') || 'semesters';
    const id = new URLSearchParams(window.location.search).get('id');

    if (!window.currentQuizPage) window.currentQuizPage = 1;

    // Helper for Stale-While-Revalidate
    const fetchWithCache = async (key, endpoint, renderFn) => {
        const cached = Cache.get(key);
        if (cached) {
            console.log(`[Cache Hit] Rendering ${key} instantly`);
            renderFn(root, cached);
        } else {
            // Show Skeleton Loading
            root.innerHTML = `
                <div class="container mt-4">
                    <div class="skeleton skeleton-text" style="width: 200px; height: 2rem; margin-bottom: 2rem;"></div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
                        ${Skeleton.card(6)}
                    </div>
                </div>
            `;
        }

        try {
            const data = await api.get(endpoint);
            // Only re-render if data changed or wasn't cached
            if (JSON.stringify(data) !== JSON.stringify(cached)) {
                console.log(`[Network] Updating ${key}`);
                Cache.set(key, data, 5); // 5 min TTL
                renderFn(root, data);
            }
        } catch (err) {
            if (!cached) {
                root.innerHTML = `<div class="container mt-4"><div class="alert alert-danger">${err.message}</div></div>`;
            } else {
                console.error('Background fetch failed, keeping cached data', err);
            }
        }
    };

    try {
        if (view === 'semesters') {
            await fetchWithCache('semesters', '/semesters', renderSemesters);
        } else if (view === 'subjects' && id) {
            await fetchWithCache(`subjects_${id}`, `/subjects?semesterId=${id}`, renderSubjects);
        } else if (view === 'quizzes' && id) {
            renderQuizzesWithControls(root, id);
        }
    } catch (err) {
        root.innerHTML = `<div class="container mt-4"><div class="alert alert-danger">${err.message}</div></div>`;
    }
}


function renderHeader(title, showBack = false) {
    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div style="display: flex; gap: 1rem; align-items: center;">
                ${showBack ? '<button class="btn btn-secondary" onclick="window.history.back()">← Back</button>' : ''}
                <h2 class="mb-0">${title}</h2>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="localStorage.clear(); window.router.navigate('/login')">Logout</button>
        </div>
    `;
}

function renderSemesters(root, list) {
    root.innerHTML = `
    <div class="container mt-4">
            ${renderHeader('Select Semester')}
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
                ${list.map(item => `
                    <div class="card" style="cursor: pointer; transition: transform 0.2s;" 
                         onclick="window.router.navigate('/courses?view=subjects&id=${item._id}')"
                         onmouseover="this.style.transform='translateY(-2px)'"
                         onmouseout="this.style.transform='translateY(0)'">
                        <h3>${item.name}</h3>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderSubjects(root, list) {
    root.innerHTML = `
    <div class="container mt-4">
            ${renderHeader('Select Subject', true)}
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
                ${list.length === 0 ? '<p>No subjects found.</p>' : ''}
                ${list.map(item => `
                    <div class="card" style="cursor: pointer; transition: transform 0.2s;" 
                         onclick="window.router.navigate('/courses?view=quizzes&id=${item._id}')"
                         onmouseover="this.style.transform='translateY(-2px)'"
                         onmouseout="this.style.transform='translateY(0)'">
                        <h3>${item.name}</h3>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function renderQuizzesWithControls(root, subjectId) {
    // Initial State
    let state = {
        page: 1,
        limit: 10, // Increased limit for better UX
        search: '',
        sort: 'latest',
        totalPages: 1
    };

    // Render Container Structure
    root.innerHTML = `
    <div class="container mt-4">
        ${renderHeader('Select Quiz', true)}
        
        <!-- Controls -->
        <div class="card mb-4" style="padding: 1rem; background: #f8fafc;">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <input type="text" id="quiz-search" placeholder="Search quizzes..." class="input-field" style="padding: 0.5rem; flex-grow: 1;">
                <select id="quiz-sort" class="input-field" style="padding: 0.5rem;">
                    <option value="latest">Latest Released</option>
                    <option value="oldest">Oldest Released</option>
                </select>
                <button id="quiz-search-btn" class="btn btn-secondary">Search</button>
            </div>
        </div>

        <div id="quiz-list-container">
            <p>Loading quizzes...</p>
        </div>

        <div id="pagination-controls" style="display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; align-items: center;"></div>
    </div>
    `;

    // Event Listeners
    const searchInput = document.getElementById('quiz-search');
    const sortSelect = document.getElementById('quiz-sort');
    const searchBtn = document.getElementById('quiz-search-btn');

    const fetchAndRender = async () => {
        const container = document.getElementById('quiz-list-container');
        // Show Skeleton List
        container.innerHTML = `
            <div style="display: grid; gap: 1rem;">
                ${Skeleton.list(3)}
            </div>
        `;
        document.getElementById('pagination-controls').innerHTML = ''; // Clear pagination while loading

        try {
            const params = new URLSearchParams({
                subjectId,
                page: state.page,
                limit: state.limit,
                sort: state.sort
            });

            if (state.search) params.append('search', state.search);

            const { quizzes, totalPages, currentPage } = await api.get(`/quizzes?${params.toString()}`);
            state.totalPages = totalPages;
            state.page = currentPage;

            // Fetch Progress only for displayed quizzes
            const user = JSON.parse(localStorage.getItem('prepstack_user'));
            let attempts = [];
            if (user && user._id && quizzes.length > 0) {
                // Optimization: Fetch attempts only for these quizzes if needed, 
                // but for now we fetch all user attempts history which might be heavy eventually.
                // A better backend endpoint would be GET /attempts?userId=...&quizIds=...
                // Reusing existing history endpoint for simplicity as per current backend.
                try {
                    attempts = await api.get(`/attempts/history/${user._id}`);
                } catch (e) { console.warn('Fetch attempts failed', e); }
            }

            const quizzesWithProgress = quizzes.map(q => {
                // Find all attempts for this quiz
                const quizAttempts = attempts.filter(a => (a.quizId._id || a.quizId) === q._id);

                // Sort by date descending (latest first)
                quizAttempts.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

                const attempt = quizAttempts[0]; // Get the latest one

                return {
                    ...q,
                    isAttempted: !!attempt,
                    latestScore: attempt && attempt.score !== undefined ? attempt.score : (attempt ? 0 : null),
                    lastAttemptId: attempt ? attempt._id : null
                };
            });

            renderQuizList(container, quizzesWithProgress);
            renderPagination();

        } catch (err) {
            container.innerHTML = `<p style="color:red">Error loading quizzes: ${err.message}</p>`;
        }
    };

    const renderQuizList = (container, list) => {
        if (list.length === 0) {
            container.innerHTML = '<p>No quizzes found.</p>';
            return;
        }
        container.innerHTML = `
            <div style="display: grid; gap: 1rem;">
                ${list.map(item => `
                    <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h3>${item.title}</h3>
                            <div class="text-secondary" style="display: flex; gap: 1rem; font-size: 0.9rem; margin-top: 0.5rem;">
                                <span style="display: flex; align-items: center; gap: 0.25rem;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    ${item.duration} mins
                                </span>
                                <span style="display: flex; align-items: center; gap: 0.25rem;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    ${item.totalQuestions || 0} Questions
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            ${(() => {
                if (!item.isAttempted) return '';
                const score = item.latestScore || 0;
                const total = item.totalQuestions || 1; // avoid division by zero
                const percentage = (score / total) * 100;

                let style = 'display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.5rem 0.75rem; border-radius: 99px; font-size: 0.85rem; font-weight: 500; border: 1px solid;';
                let iconColor = 'currentColor';

                if (percentage > 80) {
                    style += ' background: #ecfdf5; color: #047857; border-color: #a7f3d0;'; // Green
                    iconColor = '#047857';
                } else if (percentage > 40) {
                    style += ' background: #fffbeb; color: #b45309; border-color: #fcd34d;'; // Orange
                    iconColor = '#b45309';
                } else {
                    style += ' background: #fef2f2; color: #b91c1c; border-color: #fecaca;'; // Red
                    iconColor = '#b91c1c';
                }

                return `
                                    <span class="badge" style="${style}">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        Solved (${score}/${item.totalQuestions})
                                    </span>
                                `;
            })()}
                            
                            ${item.isAttempted && item.lastAttemptId ?
                `<button class="btn btn-secondary" onclick="window.router.navigate('/review/${item.lastAttemptId}')">Review</button>`
                : ''}

                            <button class="btn btn-primary" onclick="window.router.navigate('/attempt/${item._id}')">
                                ${item.isAttempted ? 'Re-take' : 'Start Quiz'}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    };

    const renderPagination = () => {
        const paginationContainer = document.getElementById('pagination-controls');
        if (state.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        paginationContainer.innerHTML = `
            <button id="prev-page-btn" class="btn btn-secondary" ${state.page === 1 ? 'disabled' : ''}>Previous</button>
            <span style="color: var(--text-secondary);">Page ${state.page} of ${state.totalPages}</span>
            <button id="next-page-btn" class="btn btn-secondary" ${state.page === state.totalPages ? 'disabled' : ''}>Next</button>
         `;

        document.getElementById('prev-page-btn').onclick = () => {
            if (state.page > 1) {
                state.page--;
                fetchAndRender();
            }
        };
        document.getElementById('next-page-btn').onclick = () => {
            if (state.page < state.totalPages) {
                state.page++;
                fetchAndRender();
            }
        };
    };

    // Attach listeners
    searchBtn.onclick = () => {
        state.search = searchInput.value;
        state.page = 1;
        fetchAndRender();
    };

    searchInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            state.search = searchInput.value;
            state.page = 1;
            fetchAndRender();
        }
    };

    sortSelect.onchange = () => {
        state.sort = sortSelect.value;
        state.page = 1;
        fetchAndRender();
    };

    // Initial Fetch
    await fetchAndRender();
}
