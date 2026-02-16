export const LoadingButton = {
    /**
     * Toggles the loading state of a button
     * @param {HTMLElement} btn - The button element
     * @param {boolean} isLoading - Whether to show loading state
     * @param {string} [loadingText='Loading...'] - Text to show while loading
     */
    setLoading(btn, isLoading, loadingText = 'Loading...') {
        if (!btn) return;

        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.style.cursor = 'not-allowed';
            btn.innerHTML = `
                <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
                    <svg class="animate-spin" style="animation: spin 1s linear infinite;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                    ${loadingText}
                </span>
            `;

            // Add keyframes if not present
            if (!document.getElementById('spin-style')) {
                const style = document.createElement('style');
                style.id = 'spin-style';
                style.textContent = `
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            if (btn.dataset.originalText) {
                btn.innerHTML = btn.dataset.originalText;
            }
        }
    }
};
