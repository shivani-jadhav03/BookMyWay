/**
 * Enhanced Modern Notification System
 * Replaces alert(), confirm(), and prompt() with beautiful UI
 */

class NotificationSystem {
    constructor() {
        this.init();
    this.toastContainer = null;
        this.modalContainer = null;
    this.currentModal = null;
    this.initContainers();
    this.addGlobalStyles();
    this.replaceNativeFunctions();
    }

    init() {
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initContainers());
        } else {
            this.initContainers();
        }
    }

    initContainers() {
        // Initialize toast container
        if (!document.querySelector('.toast-container')) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        } else {
            this.toastContainer = document.querySelector('.toast-container');
        }

        // Initialize modal container
        if (!document.querySelector('.modal-container')) {
            this.modalContainer = document.createElement('div');
            this.modalContainer.className = 'modal-container';
            document.body.appendChild(this.modalContainer);
        } else {
            this.modalContainer = document.querySelector('.modal-container');
        }
    }

    addGlobalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* ========== ENHANCED NOTIFICATION STYLES ========== */
            
            /* Modal Container */
            .modal-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease-out;
            }

            .modal-container.show {
                display: flex;
            }

            /* Modal Styles */
            .modal {
                background: white;
                border-radius: 16px;
                padding: 2rem;
                max-width: 480px;
                width: 90%;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 12px 25px -6px rgba(0, 0, 0, 0.15);
                border: 1px solid rgba(0, 0, 0, 0.1);
                animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid #f1f5f9;
            }

            .modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: #1f2937;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #6b7280;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 8px;
                transition: all 0.2s ease;
                line-height: 1;
            }

            .modal-close:hover {
                background: rgba(0, 0, 0, 0.1);
                color: #374151;
            }

            .modal-body {
                color: #4b5563;
                line-height: 1.6;
                font-size: 1rem;
                margin-bottom: 1.5rem;
            }

            .modal-footer {
                display: flex;
                gap: 0.75rem;
                justify-content: flex-end;
            }

            .modal-button {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                font-size: 0.95rem;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 80px;
            }

            .modal-button.primary {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
            }

            .modal-button.primary:hover {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            }

            .modal-button.secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            .modal-button.secondary:hover {
                background: #e5e7eb;
                transform: translateY(-1px);
            }

            /* Enhanced Toast Styles */
            .toast {
                background: white;
                border-radius: 12px;
                padding: 16px 20px;
                margin-bottom: 12px;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
                border: 1px solid rgba(0, 0, 0, 0.08);
                display: flex;
                align-items: center;
                gap: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                font-weight: 500;
                line-height: 1.4;
                pointer-events: auto;
                transform: translateX(400px);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            .toast.show {
                transform: translateX(0);
                opacity: 1;
            }

            .toast.hide {
                transform: translateX(400px);
                opacity: 0;
            }

            .toast-icon {
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                color: white;
                font-weight: 600;
            }

            .toast.success .toast-icon {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }

            .toast.error .toast-icon {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            }

            .toast.warning .toast-icon {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            }

            .toast.info .toast-icon {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            }

            .toast-message {
                flex: 1;
                color: #1f2937;
            }

            .toast.success .toast-message {
                color: #065f46;
            }

            .toast.error .toast-message {
                color: #991b1b;
            }

            .toast.warning .toast-message {
                color: #92400e;
            }

            .toast.info .toast-message {
                color: #1e40af;
            }

            /* Animations */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from {
                    transform: translateY(30px) scale(0.9);
                    opacity: 0;
                }
                to {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
            }

            @keyframes slideDown {
                from {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
                to {
                    transform: translateY(30px) scale(0.9);
                    opacity: 0;
                }
            }

            /* Responsive */
            @media (max-width: 480px) {
                .modal {
                    width: 95%;
                    padding: 1.5rem;
                    margin: 1rem;
                }
                
                .modal-footer {
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .modal-button {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    replaceNativeFunctions() {
        // Store original functions
        window.originalAlert = window.alert;
        window.originalConfirm = window.confirm;
        window.originalPrompt = window.prompt;

        // Replace with custom functions
        window.alert = (message) => this.showToast(message, 'info');
        window.confirm = (message, onConfirm) => this.showConfirm(message, onConfirm);
        window.prompt = (message, defaultValue, onConfirm) => this.showPrompt(message, defaultValue, onConfirm);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.createIcon(type);
        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;
        
        toast.appendChild(icon);
        toast.appendChild(messageEl);
        this.toastContainer.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto remove
        setTimeout(() => {
            this.hideToast(toast);
        }, duration);
        
        return toast;
    }

    hideToast(toast) {
        if (!toast) return;
        
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Show confirmation modal
     */
    showConfirm(message, onConfirm) {
        return new Promise((resolve) => {
            const modal = this.createModal('⚠️', 'Confirmation', message);
            const confirmBtn = modal.querySelector('.modal-button.primary');
            const cancelBtn = modal.querySelector('.modal-button.secondary');
            
            const cleanup = () => {
                this.hideModal(modal);
                document.removeEventListener('keydown', handleKeydown);
            };
            
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            const handleKeydown = (e) => {
                if (e.key === 'Enter') {
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            document.addEventListener('keydown', handleKeydown);
            
            // Focus on confirm button
            confirmBtn.focus();
            
            // Store for cleanup
            modal._cleanup = cleanup;
            this.currentModal = modal;
        });
    }

    /**
     * Show prompt modal
     */
    showPrompt(message, defaultValue = '', onConfirm) {
        return new Promise((resolve) => {
            const modal = this.createModal('✏️', 'Input Required', message, true);
            const input = modal.querySelector('.modal-input');
            const confirmBtn = modal.querySelector('.modal-button.primary');
            const cancelBtn = modal.querySelector('.modal-button.secondary');
            
            if (defaultValue) {
                input.value = defaultValue;
            }
            
            const cleanup = () => {
                const value = input.value.trim();
                this.hideModal(modal);
                document.removeEventListener('keydown', handleKeydown);
                resolve(value);
            };
            
            const handleConfirm = () => {
                cleanup();
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(null);
            };
            
            const handleKeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            document.addEventListener('keydown', handleKeydown);
            
            // Focus on input
            setTimeout(() => input.focus(), 100);
            
            // Store for cleanup
            modal._cleanup = cleanup;
            this.currentModal = modal;
        });
    }

    /**
     * Create modal element
     */
    createModal(icon, title, message, includeInput = false) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        let bodyContent = `<div class="modal-body">${message}</div>`;
        if (includeInput) {
            bodyContent = `
                <div class="modal-body">
                    <div style="margin-bottom: 1rem;">${message}</div>
                    <input type="text" class="modal-input" placeholder="Enter your response..." style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div class="modal-header">
                <div class="modal-title">
                    <span style="font-size: 1.5rem;">${icon}</span>
                    ${title}
                </div>
                <button class="modal-close" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${bodyContent}
            <div class="modal-footer">
                <button class="modal-button primary">Confirm</button>
                <button class="modal-button secondary">Cancel</button>
            </div>
        `;
        
        // Add close functionality
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.hideModal(modal));
        
        this.modalContainer.appendChild(modal);
        this.modalContainer.classList.add('show');
        
        return modal;
    }

    /**
     * Hide modal
     */
    hideModal(modal) {
        if (!modal) return;
        
        modal.style.animation = 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        setTimeout(() => {
            this.modalContainer.classList.remove('show');
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            if (modal._cleanup) {
                modal._cleanup();
            }
        }, 300);
    }

    /**
     * Create icon element
     */
    createIcon(type) {
        const icon = document.createElement('div');
        icon.className = 'toast-icon';
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠️',
            info: 'ℹ'
        };
        
        icon.textContent = icons[type] || icons.info;
        return icon;
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        // Clear all toasts
        const toasts = this.toastContainer.querySelectorAll('.toast');
        toasts.forEach(toast => this.hideToast(toast));
        
        // Clear any open modals
        if (this.currentModal) {
            this.hideModal(this.currentModal);
        }
    }
}

// Create global instance
window.notificationSystem = new NotificationSystem();

// Export functions for easy access
window.showToast = (message, type, duration) => window.notificationSystem.showToast(message, type, duration);
window.showConfirm = (message, onConfirm) => window.notificationSystem.showConfirm(message, onConfirm);
window.showPrompt = (message, defaultValue, onConfirm) => window.notificationSystem.showPrompt(message, defaultValue, onConfirm);

// Auto-initialize
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}
