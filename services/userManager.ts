import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class UserManager {
    private usersFilePath: string;
    private currentUsersFilePath: string;

    constructor() {
        this.usersFilePath = path.join(__dirname, '../data/users.txt');
        this.currentUsersFilePath = path.join(__dirname, '../data/current_user.txt');
        this.ensureDataDirectory();
        this.initializeUsersFile();
    }

    /**
     * Ensure data directory exists
     */
    ensureDataDirectory() {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    /**
     * Initialize users file with demo data if it doesn't exist and ensure seeded admin exists
     */
    initializeUsersFile() {
        const seedUsers = [
            {
                id: '1',
                fullName: 'Admin User',
                email: 'admin@bookmyway.com',
                password: 'admin123',
                role: 'admin',
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                fullName: 'Demo User',
                email: 'demo@bookmyway.com',
                password: 'demo123',
                role: 'user',
                createdAt: new Date().toISOString()
            },
            {
                id: '3',
                fullName: 'John Smith',
                email: 'john@example.com',
                password: 'password123',
                role: 'user',
                createdAt: new Date().toISOString()
            }
        ];

        // If the file does not exist, create it with seed data
        if (!fs.existsSync(this.usersFilePath)) {
            this.saveUsers(seedUsers);
            return;
        }

        // If the file exists, ensure admin and roles are present
        try {
            const existingUsers = this.getUsers();
            const hasAdmin = existingUsers.some(u => u.email?.toLowerCase() === 'admin@bookmyway.com');

            // Backfill missing roles on existing users
            let modified = false;
            const updatedUsers = existingUsers.map(user => {
                if (!user.role) {
                    modified = true;
                    return { ...user, role: 'user' };
                }
                return user;
            });

            if (!hasAdmin) {
                modified = true;
                const adminSeed = seedUsers[0];
                updatedUsers.push(adminSeed);
            }

            if (modified) {
                this.saveUsers(updatedUsers);
            }
        } catch (error) {
            console.error('Error initializing users file, resetting with seed data:', error);
            this.saveUsers(seedUsers);
        }
    }

    /**
     * Read users from file
     */
    getUsers() {
        try {
            if (!fs.existsSync(this.usersFilePath)) {
                return [];
            }
            const data = fs.readFileSync(this.usersFilePath, 'utf8');
            if (!data.trim()) {
                return [];
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading users file:', error);
            return [];
        }
    }

    /**
     * Save users to file
     */
    saveUsers(users) {
        try {
            fs.writeFileSync(this.usersFilePath, JSON.stringify(users, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving users file:', error);
            return false;
        }
    }

    /**
     * Register a new user
     */
    register(userData) {
        const { fullName, email, password, confirmPassword } = userData;

        // Validation
        if (!fullName || !email || !password || !confirmPassword) {
            throw new Error('All fields are required');
        }

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        // Get existing users
        const users = this.getUsers();

        // Check if user already exists
        if (users.find(user => user.email.toLowerCase() === email.toLowerCase())) {
            throw new Error('User with this email already exists');
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            fullName,
            email: email.toLowerCase(),
            password, // In a real app, this should be hashed
            role: 'user',
            createdAt: new Date().toISOString()
        };

        // Add to users array
        users.push(newUser);

        // Save to file
        if (!this.saveUsers(users)) {
            throw new Error('Failed to save user data');
        }

        return { 
            success: true, 
            message: 'Account created successfully!',
            user: {
                id: newUser.id,
                fullName: newUser.fullName,
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt
            }
        };
    }

    /**
     * Login user
     */
    login(email, password) {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Get users from file
        const users = this.getUsers();

        // Find user
        const user = users.find(u => 
            u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Create session data
        const sessionData = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role || 'user',
            loginTime: new Date().toISOString()
        };

        // Save current user session to file
        try {
            fs.writeFileSync(this.currentUsersFilePath, JSON.stringify(sessionData, null, 2));
        } catch (error) {
            console.error('Error saving current user session:', error);
        }

        return { 
            success: true, 
            message: 'Login successful!', 
            user: sessionData 
        };
    }

    /**
     * Logout user
     */
    logout() {
        try {
            // Remove current user session file
            if (fs.existsSync(this.currentUsersFilePath)) {
                fs.unlinkSync(this.currentUsersFilePath);
            }
            return { success: true, message: 'Logged out successfully!' };
        } catch (error) {
            console.error('Error during logout:', error);
            throw new Error('Failed to logout');
        }
    }

    /**
     * Get current logged-in user
     */
    getCurrentUser() {
        try {
            if (!fs.existsSync(this.currentUsersFilePath)) {
                return null;
            }
            const data = fs.readFileSync(this.currentUsersFilePath, 'utf8');
            if (!data.trim()) {
                return null;
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading current user session:', error);
            return null;
        }
    }

    /**
     * Check if user is logged in
     */
    isUserLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    /**
     * Get all users (admin function - remove passwords)
     */
    getAllUsers() {
        const users = this.getUsers();
        return users.map(user => ({
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            createdAt: user.createdAt
        }));
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Get user stats
     */
    getUserStats() {
        const users = this.getUsers();
        const currentUser = this.getCurrentUser();
        
        return {
            totalUsers: users.length,
            isLoggedIn: currentUser !== null,
            currentUser: currentUser ? {
                fullName: currentUser.fullName,
                email: currentUser.email,
                role: currentUser.role || 'user',
                loginTime: currentUser.loginTime
            } : null
        };
    }
}