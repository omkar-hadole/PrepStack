export const Cache = {
    prefix: 'prepstack_cache_',

    set(key, data, ttlMinutes = 5) {
        const item = {
            data,
            expiry: Date.now() + ttlMinutes * 60 * 1000
        };
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(item));
        } catch (e) {
            console.warn('Cache storage failed', e);
        }
    },

    get(key) {
        const itemStr = localStorage.getItem(this.prefix + key);
        if (!itemStr) return null;

        try {
            const item = JSON.parse(itemStr);
            if (Date.now() > item.expiry) {
                localStorage.removeItem(this.prefix + key);
                return null;
            }
            return item.data;
        } catch (e) {
            return null;
        }
    },

    remove(key) {
        localStorage.removeItem(this.prefix + key);
    },

    clear() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
    }
};
