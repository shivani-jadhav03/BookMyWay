/**
 * Profile Page Management
 * Handles user profile display and interactions
 */

class ProfileManager {
    constructor() {
        this.authManager = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Wait for auth manager to be available
        if (typeof authManager !== 'undefined') {
            this.authManager = authManager;
        } else {
            // Wait a bit for the auth manager to initialize
            setTimeout(() => this.init(), 100);
            return;
        }

        await this.loadProfile();
        this.setupEventListeners();
    }

    /**
     * Load user profile data
     */
    async loadProfile() {
        const loadingState = document.getElementById('loadingState');
        const notLoggedIn = document.getElementById('notLoggedIn');
        const profileContent = document.getElementById('profileContent');

        try {
            // Check authentication status
            await this.authManager.checkAuthStatus();

            if (!this.authManager.isLoggedIn) {
                this.showNotLoggedIn();
                return;
            }

            // Get current user data
            const userData = await this.fetchUserData();
            if (userData) {
                this.currentUser = userData;
                this.displayProfile();
            } else {
                this.showNotLoggedIn();
            }

        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Failed to load profile information');
        }
    }

    /**
     * Fetch user data from server
     */
    async fetchUserData() {
        try {
            const response = await fetch('/api/auth/profile');
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    return result.profile;
                }
            }
            return null;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    }

    /**
     * Display profile information
     */
    displayProfile() {
        const loadingState = document.getElementById('loadingState');
        const notLoggedIn = document.getElementById('notLoggedIn');
        const profileContent = document.getElementById('profileContent');

        // Hide loading and not logged in states
        loadingState.style.display = 'none';
        notLoggedIn.style.display = 'none';

        // Update profile header
        document.getElementById('userFullName').textContent = this.currentUser.fullName || 'Unknown User';
        document.getElementById('userEmail').textContent = this.currentUser.email || 'No email';

        // Update account information
        document.getElementById('displayFullName').textContent = this.currentUser.fullName || 'Not provided';
        document.getElementById('displayEmail').textContent = this.currentUser.email || 'Not provided';
        document.getElementById('displayCreatedAt').textContent = this.formatDate(this.currentUser.createdAt) || 'Not available';
        
        // Update session information
        document.getElementById('displayLoginTime').textContent = this.formatDateTime(this.currentUser.loginTime) || 'Current session';

        // Show profile content
        profileContent.style.display = 'block';
    }

    /**
     * Show not logged in state
     */
    showNotLoggedIn() {
        const loadingState = document.getElementById('loadingState');
        const notLoggedIn = document.getElementById('notLoggedIn');
        const profileContent = document.getElementById('profileContent');

        loadingState.style.display = 'none';
        profileContent.style.display = 'none';
        notLoggedIn.style.display = 'block';
    }

    /**
     * Show error message
     */
    showError(message) {
        const loadingState = document.getElementById('loadingState');
        loadingState.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Error</h2>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }

    /**
     * Format date string
     */
    formatDate(dateString) {
        if (!dateString) return 'Not available';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid date';
        }
    }

    /**
     * Format datetime string
     */
    formatDateTime(dateString) {
        if (!dateString) return 'Not available';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid date';
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh profile button functionality is handled by the global function
        // Other event listeners can be added here as needed
    }
}

/**
 * Global functions for profile interactions
 */

/**
 * Refresh profile data
 */
async function refreshProfile() {
    const refreshButton = event.target;
    const originalContent = refreshButton.innerHTML;
    
    // Show loading state
    refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshButton.disabled = true;
    
    try {
        // Reload profile data
        if (window.profileManager) {
            await window.profileManager.loadProfile();
        }
        
        // Show success feedback
        refreshButton.innerHTML = '<i class="fas fa-check"></i> Refreshed!';
        setTimeout(() => {
            refreshButton.innerHTML = originalContent;
            refreshButton.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error refreshing profile:', error);
        
        // Show error feedback
        refreshButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        setTimeout(() => {
            refreshButton.innerHTML = originalContent;
            refreshButton.disabled = false;
        }, 2000);
    }
}

/**
 * Show coming soon message for features not yet implemented
 */
function showComingSoon() {
    alert('This feature is coming soon! Stay tuned for updates.');
}

/**
 * Initialize profile manager when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        window.profileManager = new ProfileManager();
    }, 500);
});

/**
 * Handle page visibility change to refresh data when user returns
 */
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.profileManager) {
        // Refresh profile data when user returns to the tab
        setTimeout(() => {
            if (window.profileManager.authManager && window.profileManager.authManager.isLoggedIn) {
                window.profileManager.loadProfile();
            }
        }, 1000);
    }
});

/**
 * Export for use in other scripts
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileManager;
}