import express from 'express';
import { UserManager } from '../services/userManager.js';
import { AnalyticsService } from '../services/analyticsService.js';

const router = express.Router();
const userManager = new UserManager();

/**
 * Register new user
 */
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, confirmPassword } = req.body;
        
        if (!fullName || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const result = userManager.register({ fullName, email, password, confirmPassword });
        AnalyticsService.logEvent({
            type: 'signup',
            userEmail: result.user.email,
            userName: result.user.fullName,
            metadata: { userId: result.user.id }
        });
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'Registration failed'
        });
    }
});

/**
 * Login user
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const result = userManager.login(email, password);
        AnalyticsService.logEvent({
            type: 'login',
            userEmail: result.user.email,
            userName: result.user.fullName,
            metadata: { userId: result.user.id }
        });
        res.json(result);
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error instanceof Error ? error.message : 'Login failed'
        });
    }
});

/**
 * Logout user
 */
router.post('/logout', async (req, res) => {
    try {
        const result = userManager.logout();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Logout failed'
        });
    }
});

/**
 * Get current user
 */
router.get('/current-user', async (req, res) => {
    try {
        const currentUser = userManager.getCurrentUser();
        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: 'No user logged in'
            });
        }
        
        res.json({
            success: true,
            user: currentUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get current user'
        });
    }
});

/**
 * Get user profile with detailed information
 */
router.get('/profile', async (req, res) => {
    try {
        const currentUser = userManager.getCurrentUser();
        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: 'No user logged in'
            });
        }

        // Get additional profile information
        const userStats = userManager.getUserStats();
        
        res.json({
            success: true,
            profile: {
                id: currentUser.id,
                fullName: currentUser.fullName,
                email: currentUser.email,
                createdAt: currentUser.createdAt,
                loginTime: currentUser.loginTime,
                role: currentUser.role || 'user',
                isActive: true,
                ...userStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get user profile'
        });
    }
});

/**
 * Check authentication status
 */
router.get('/status', async (req, res) => {
    try {
        const stats = userManager.getUserStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get auth status'
        });
    }
});

/**
 * Get all users (for admin purposes - without passwords)
 */
router.get('/users', async (req, res) => {
    try {
        const users = userManager.getAllUsers();
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get users'
        });
    }
});

export default router;