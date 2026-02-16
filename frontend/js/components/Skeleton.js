export const Skeleton = {
    card(count = 3) {
        return Array(count).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton skeleton-text" style="width: 60%; height: 1.5rem;"></div>
                <div class="skeleton skeleton-text" style="width: 40%;"></div>
                <div class="skeleton skeleton-text" style="width: 80%;"></div>
            </div>
        `).join('');
    },

    list(count = 5) {
        return Array(count).fill(0).map(() => `
            <div class="skeleton-card" style="margin-bottom: 1rem;">
                <div class="skeleton skeleton-text" style="width: 30%; height: 1.2rem;"></div>
                <div class="skeleton skeleton-text" style="width: 100%;"></div>
            </div>
        `).join('');
    }
};
