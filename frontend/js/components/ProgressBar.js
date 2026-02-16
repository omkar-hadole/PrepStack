export const ProgressBar = {
    element: null,

    init() {
        if (this.element) return;

        this.element = document.createElement('div');
        this.element.id = 'global-progress-bar';
        Object.assign(this.element.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '0%',
            height: '3px',
            backgroundColor: '#2563eb', // Primary Blue
            zIndex: '9999',
            transition: 'width 0.2s ease-out, opacity 0.4s ease-out',
            opacity: '0',
            boxShadow: '0 0 10px rgba(37, 99, 235, 0.5)'
        });
        document.body.appendChild(this.element);
    },

    start() {
        if (!this.element) this.init();
        this.element.style.opacity = '1';
        this.element.style.width = '30%';
        this.element.style.transition = 'width 10s cubic-bezier(0.1, 0.5, 0.1, 0.1)'; 
    },

    finish() {
        if (!this.element) return;
        this.element.style.transition = 'width 0.2s ease-out';
        this.element.style.width = '100%';

        setTimeout(() => {
            if (this.element) {
                this.element.style.opacity = '0';
                this.element.style.width = '0%';
                // Reset transition for next start
                setTimeout(() => {
                    if (this.element) this.element.style.transition = 'none';
                }, 400);
            }
        }, 300);
    }
};
