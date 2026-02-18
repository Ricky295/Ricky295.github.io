/**
 * Shared Utilities for Persistence and UI
 */
const MathdokuUtils = {
    saveToStorage(data) {
        localStorage.setItem('mathdoku_state', JSON.stringify(data));
    },

    loadFromStorage() {
        const data = localStorage.getItem('mathdoku_state');
        return data ? JSON.parse(data) : null;
    },

    exportB64(state) {
        const b64 = btoa(JSON.stringify(state));
        return b64;
    },

    importB64(str) {
        try {
            return JSON.parse(atob(str));
        } catch (e) {
            console.error("Invalid Base64 format");
            return null;
        }
    }
};
