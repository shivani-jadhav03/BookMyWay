/**
 * Modern Toast Notification System
 * Replaces browser alerts with elegant, non-blocking notifications
 */

class ToastNotification {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    show(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Create icon based on type
        const icon = this.createIcon(type);
        
        // Create message
        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;
        
        // Assemble toast
        toast.appendChild(icon);
        toast.appendChild(messageEl);
        
        // Add to container
        this.container.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            this.hide(toast);
        }, 3000);
        
        return toast;
    }

    hide(toast) {
        if (!toast) return;
        
        toast.classList.add('hide');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    createIcon(type) {
        const icon = document.createElement('div');
        icon.className = 'toast-icon';
        
        switch (type) {
            case 'success':
                icon.innerHTML = '✓';
                break;
            case 'error':
                icon.innerHTML = '✕';
                break;
            case 'warning':
                icon.innerHTML = '!';
                break;
            default:
                icon.innerHTML = 'ℹ';
                icon.style.background = '#3b82f6';
        }
        
        return icon;
    }

    // Clear all toasts
    clear() {
        const toasts = this.container.querySelectorAll('.toast');
        toasts.forEach(toast => this.hide(toast));
    }
}

// Create global instance
const toastNotification = new ToastNotification();

// Global function for easy access
function showToast(message, type = 'info') {
    return toastNotification.show(message, type);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        toastNotification.init();
    });
} else {
    toastNotification.init();
}
