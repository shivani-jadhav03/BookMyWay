/**
 * Authentication Management System
 * Handles login, logout, and user session management using server-side file storage
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.init();
    }

    async init() {
        // Check if user is already logged in by calling the server
        await this.checkAuthStatus();
        
        // Initialize UI based on auth state
        this.updateUI();
    }

    /**
     * Check authentication status from server
     */
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            if (response.status === 429) {
                // Rate limited: keep existing state instead of forcing logout
                return;
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.isLoggedIn) {
                    this.currentUser = result.data.currentUser;
                    this.isLoggedIn = true;
                    localStorage.setItem('authUser', JSON.stringify(this.currentUser));
                } else {
                    this.currentUser = null;
                    this.isLoggedIn = false;
                    localStorage.removeItem('authUser');
                }
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            // Fall back to cached user if available
            const cached = localStorage.getItem('authUser');
            if (cached) {
                this.currentUser = JSON.parse(cached);
                this.isLoggedIn = true;
            } else {
                this.currentUser = null;
                this.isLoggedIn = false;
            }
        }
    }

    /**
     * Register a new user
     */
    async register(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            // Update local state
            this.currentUser = result.user;
            this.isLoggedIn = true;

            // Update UI
            this.updateUI();

            // Cache user locally to survive transient errors
            localStorage.setItem('authUser', JSON.stringify(this.currentUser));

            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            // Update local state
            this.currentUser = null;
            this.isLoggedIn = false;

            // Update UI
            this.updateUI();

            localStorage.removeItem('authUser');

            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is logged in
     */
    isUserLoggedIn() {
        return this.isLoggedIn;
    }

    /**
     * Update UI based on authentication state
     */
    updateUI() {
        // Update navigation
        this.updateNavigation();

        // Update user greeting
        this.updateUserGreeting();

        // Update page-specific elements
        this.updatePageSpecificElements();
    }

    /**
     * Update navigation based on auth state
     */
    updateNavigation() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        const onProfilePage = window.location.pathname.includes('profile');

        // Find existing auth-related elements
        const existingAuthElements = navLinks.querySelectorAll('.auth-element');
        existingAuthElements.forEach(el => el.remove());

        // Remove any static signup CTA to avoid duplicate buttons
        const staticCtas = navLinks.querySelectorAll('.cta-button');
        staticCtas.forEach(btn => btn.remove());

        if (this.isLoggedIn) {
            const isAdmin = (this.currentUser.role || 'user') === 'admin';

            // Admin-only dashboard nav link
            if (isAdmin) {
                const adminLink = document.createElement('a');
                adminLink.href = 'dashboard.html';
                adminLink.className = 'auth-element admin-link';
                adminLink.textContent = 'Dashboard';
                navLinks.appendChild(adminLink);
            }

            // Show user menu with dropdown
            const userMenu = document.createElement('div');
            userMenu.className = 'auth-element user-menu';
            userMenu.innerHTML = `
                <button class="user-menu-toggle" aria-haspopup="true" aria-expanded="false">
                    <span class="user-greeting">Hello, ${this.currentUser.fullName.split(' ')[0]}!</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-menu-dropdown" role="menu">
                    ${isAdmin ? `<a href="dashboard.html" class="profile-link" role="menuitem"><i class="fas fa-signal"></i> Dashboard</a>` : ''}
                    ${!onProfilePage ? `<a href="profile.html" class="profile-link" role="menuitem"><i class="fas fa-user"></i> Profile</a>` : ''}
                    <button class="logout-btn" role="menuitem" onclick="authManager.handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
                </div>
            `;
            navLinks.appendChild(userMenu);

            const toggle = userMenu.querySelector('.user-menu-toggle');
            const dropdown = userMenu.querySelector('.user-menu-dropdown');
            if (toggle && dropdown) {
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = dropdown.classList.toggle('open');
                    toggle.setAttribute('aria-expanded', isOpen.toString());
                });

                document.addEventListener('click', () => {
                    dropdown.classList.remove('open');
                    toggle.setAttribute('aria-expanded', 'false');
                });
            }
        } else {
            // Show login/signup links
            const authLinks = document.createElement('div');
            authLinks.className = 'auth-element auth-links';
            authLinks.innerHTML = `
                <a href="login.html" class="login-link">Login</a>
                <a href="signup.html" class="cta-button">Sign Up</a>
            `;
            navLinks.appendChild(authLinks);
        }

        // If we're on the profile page, remove the static nav Profile link to avoid duplication
        if (onProfilePage) {
            const staticProfileLink = navLinks.querySelector('a[href="profile.html"]');
            if (staticProfileLink) {
                staticProfileLink.remove();
            }
        }
    }

    /**
     * Update user greeting on homepage
     */
    updateUserGreeting() {
        const heroContent = document.querySelector('.hero-content h1');
        if (!heroContent) return;

        if (this.isLoggedIn) {
            const firstName = this.currentUser.fullName.split(' ')[0];
            if (!heroContent.textContent.includes('Welcome back')) {
                heroContent.textContent = `Welcome back, ${firstName}! Ready for your next adventure?`;
            }
        } else {
            if (heroContent.textContent.includes('Welcome back')) {
                heroContent.textContent = 'Travel Across the World With Ease';
            }
        }
    }

    /**
     * Update page-specific elements based on auth state
     */
    updatePageSpecificElements() {
        // Hide/show elements based on auth state
        const loginOnlyElements = document.querySelectorAll('.login-required');
        const logoutOnlyElements = document.querySelectorAll('.logout-required');

        loginOnlyElements.forEach(el => {
            el.style.display = this.isLoggedIn ? 'block' : 'none';
        });

        logoutOnlyElements.forEach(el => {
            el.style.display = this.isLoggedIn ? 'none' : 'block';
        });

        // Add user dashboard section to homepage if logged in
        this.updateUserDashboard();
    }

    /**
     * Add user dashboard for logged-in users
     */
    updateUserDashboard() {
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            const featuresSection = document.querySelector('.features');
            let userDashboard = document.querySelector('.user-dashboard');
            
            if (this.isLoggedIn && !userDashboard && featuresSection) {
                // Create user dashboard section
                userDashboard = document.createElement('section');
                userDashboard.className = 'user-dashboard';
                userDashboard.innerHTML = `
                    <div class="container">
                        <div class="section-title">
                            <h2>Welcome back, ${this.currentUser.fullName}!</h2>
                            <p>Your travel dashboard</p>
                        </div>
                        <div class="dashboard-grid">
                            <div class="dashboard-card">
                                <div class="dashboard-icon">
                                    <i class="fas fa-search"></i>
                                </div>
                                <h3>Quick Search</h3>
                                <p>Find your next adventure</p>
                            </div>
                            <div class="dashboard-card">
                                <div class="dashboard-icon">
                                    <i class="fas fa-history"></i>
                                </div>
                                <h3>Recent Searches</h3>
                                <p>View your search history</p>
                            </div>
                            <div class="dashboard-card">
                                <div class="dashboard-icon">
                                    <i class="fas fa-user-circle"></i>
                                </div>
                                <h3>Profile</h3>
                                <p>Manage your account</p>
                            </div>
                        </div>
                    </div>
                `;
                
                // Insert before features section
                featuresSection.parentNode.insertBefore(userDashboard, featuresSection);
            } else if (!this.isLoggedIn && userDashboard) {
                // Remove dashboard if user logs out
                userDashboard.remove();
            }
        }
    }

    /**
     * Handle logout with UI feedback
     */
    async handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            try {
                const result = await this.logout();
                if (result.success) {
                    // Show success message
                    this.showMessage(result.message, 'success');
                    
                    // Redirect to home page after a brief delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                }
            } catch (error) {
                this.showMessage(error.message, 'error');
            }
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showMessage('Email and password are required', 'error');
            return;
        }

        try {
            const result = await this.login(email, password);
            this.showMessage(result.message, 'success');
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    /**
     * Handle signup form submission
     */
    async handleSignup(event) {
        event.preventDefault();

        const fullNameInput = document.getElementById('fullName') || document.getElementById('fullname');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPwdInput = document.getElementById('confirmPassword') || document.getElementById('confirm-password');

        const formData = {
            fullName: fullNameInput ? fullNameInput.value.trim() : '',
            email: emailInput ? emailInput.value.trim() : '',
            password: passwordInput ? passwordInput.value : '',
            confirmPassword: confirmPwdInput ? confirmPwdInput.value : ''
        };

        const termsAccepted = document.getElementById('terms').checked;

        if (!termsAccepted) {
            this.showMessage('Please accept the Terms & Conditions', 'error');
            return;
        }

        if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
            this.showMessage('All fields are required', 'error');
            return;
        }

        try {
            const result = await this.register(formData);
            this.showMessage(result.message, 'success');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `auth-message ${type}`;
        messageEl.textContent = message;

        // Style the message
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease-out;
        `;

        // Set background color based on type
        switch (type) {
            case 'success':
                messageEl.style.backgroundColor = '#10B981';
                break;
            case 'error':
                messageEl.style.backgroundColor = '#EF4444';
                break;
            default:
                messageEl.style.backgroundColor = '#3B82F6';
        }

        // Add to page
        document.body.appendChild(messageEl);

        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Add CSS for animations and auth elements
const authStyles = document.createElement('style');
authStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .user-menu {
        display: flex;
           align-items: center;
           position: relative;
    }
    
    .user-greeting {
        color: var(--dark);
        font-weight: 600;
        font-size: 0.95rem;
    }
    
        .user-menu-toggle {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            background: rgba(59, 130, 246, 0.08);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
            cursor: pointer;
            color: var(--dark);
            font-weight: 600;
        }

        .user-menu-toggle:hover {
            background: rgba(59, 130, 246, 0.15);
        }

        .user-menu-dropdown {
            position: absolute;
            top: 110%;
            right: 0;
            background: white;
            border: 1px solid rgba(0,0,0,0.08);
            border-radius: 10px;
            box-shadow: var(--shadow-lg);
            padding: 0.5rem;
            display: none;
            min-width: 180px;
            z-index: 50;
        }

        .user-menu-dropdown.open {
            display: block;
        }

        .user-menu-dropdown .profile-link,
        .user-menu-dropdown .logout-btn {
            width: 100%;
            justify-content: flex-start;
            margin: 0;
        }

        .user-menu-dropdown .profile-link {
            background: transparent;
            padding: 0.65rem 0.75rem;
            color: var(--dark);
        }

        .user-menu-dropdown .profile-link:hover {
            background: rgba(59, 130, 246, 0.08);
        }

        .user-menu-dropdown .logout-btn {
            width: 100%;
            text-align: left;
            margin-top: 0.25rem;
        }
    .logout-btn {
        background: #ef4444;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .logout-btn:hover {
        background: #dc2626;
        transform: translateY(-1px);
    }

    /* Profile settings pill buttons */
    .pill-action {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.65rem 1.1rem;
        background: linear-gradient(135deg, var(--primary), #2563eb);
        color: #fff;
        border: none;
        border-radius: 999px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
        transition: var(--transition);
    }

    .pill-action:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 24px rgba(37, 99, 235, 0.3);
    }

    .pill-action.danger {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        box-shadow: 0 8px 20px rgba(220, 38, 38, 0.25);
    }

    .pill-action.danger:hover {
        box-shadow: 0 10px 24px rgba(220, 38, 38, 0.3);
    }
    
    .auth-links {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }
    
    .login-link {
        color: var(--dark);
        text-decoration: none;
        font-weight: 600;
        transition: color 0.3s ease;
    }
    
    .login-link:hover {
        color: var(--primary);
    }
    
    .user-dashboard {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4rem 0;
    }
    
    .user-dashboard .section-title h2 {
        color: white;
        margin-bottom: 0.5rem;
    }
    
    .user-dashboard .section-title p {
        color: rgba(255, 255, 255, 0.9);
    }
    
    .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
        margin-top: 3rem;
    }
    
    .dashboard-card {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 15px;
        padding: 2rem;
        text-align: center;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        cursor: pointer;
    }
    
    .dashboard-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    
    .dashboard-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        color: #fbbf24;
    }
    
    .dashboard-card h3 {
        font-size: 1.25rem;
        margin-bottom: 0.5rem;
        color: white;
    }
    
    .dashboard-card p {
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.95rem;
    }
    
    @media (max-width: 768px) {
        .user-menu {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
        }
        
        .user-greeting {
            font-size: 0.9rem;
        }
        
        .logout-btn {
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
        }
        
        .auth-links {
            flex-direction: column;
            gap: 1rem;
        }
        
        .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }
        
        .dashboard-card {
            padding: 1.5rem;
        }
    }
`;
document.head.appendChild(authStyles);

// Auto-wire signup form submit handler to ensure Create Account works regardless of script order
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    if (signupForm && !signupForm.dataset.authWired) {
        signupForm.addEventListener('submit', (e) => authManager.handleSignup(e));
        signupForm.dataset.authWired = 'true';
    }
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}