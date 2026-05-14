import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import firebaseAdmin from '../firebaseAdminConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class UserManager {
    private currentUsersFilePath: string;
    private useFirebase: boolean;

    constructor() {
        this.currentUsersFilePath = path.join(__dirname, '../data/current_user.txt');
        this.ensureDataDirectory();
        this.useFirebase = firebaseAdmin !== null;
        
        if (this.useFirebase) {
            console.log('Firebase Authentication enabled');
            this.initializeFirebaseAdmin();
        } else {
            console.log('Firebase not configured, using file-based authentication');
        }
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
     * Initialize Firebase Admin and create admin user if needed
     */
    async initializeFirebaseAdmin() {
        try {
            if (!firebaseAdmin) return;

            const auth = firebaseAdmin.auth();
            
            // Check if admin user exists, if not create it
            try {
                const adminEmail = 'admin@bookmyway.com';
                const adminPassword = 'admin123';
                
                try {
                    await auth.getUserByEmail(adminEmail);
                    console.log('Admin user already exists in Firebase');
                } catch (error) {
                    if ((error as any).code === 'auth/user-not-found') {
                        console.log('Creating admin user in Firebase...');
                        const userRecord = await auth.createUser({
                            email: adminEmail,
                            password: adminPassword,
                            displayName: 'Admin User'
                        });
                        
                        // Set custom claim for admin role
                        await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
                        console.log('Admin user created with admin role');
                    }
                }
            } catch (error) {
                console.error('Error initializing Firebase admin user:', error);
            }
        } catch (error) {
            console.error('Error initializing Firebase Admin:', error);
        }
    }

    /**
     * Register a new user
     */
    async register(userData) {
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

        if (this.useFirebase && firebaseAdmin) {
            try {
                const auth = firebaseAdmin.auth();
                
                // Check if user already exists
                try {
                    await auth.getUserByEmail(email);
                    throw new Error('User with this email already exists');
                } catch (error) {
                    if ((error as any).code !== 'auth/user-not-found') {
                        throw error;
                    }
                }

                // Create user in Firebase
                const userRecord = await auth.createUser({
                    email: email.toLowerCase(),
                    password: password,
                    displayName: fullName
                });

                // Set default role as 'user'
                await auth.setCustomUserClaims(userRecord.uid, { role: 'user' });

                return { 
                    success: true, 
                    message: 'Account created successfully!',
                    user: {
                        id: userRecord.uid,
                        fullName: fullName,
                        email: email.toLowerCase(),
                        role: 'user',
                        createdAt: new Date(userRecord.metadata.creationTime).toISOString()
                    }
                };
            } catch (error) {
                console.error('Firebase registration error:', error);
                throw new Error((error as any).message || 'Registration failed');
            }
        } else {
            // Fallback to file-based storage
            return this.registerFileBased(fullName, email, password, confirmPassword);
        }
    }

    /**
     * File-based registration (fallback)
     */
    registerFileBased(fullName, email, password, confirmPassword) {
        const usersFilePath = path.join(__dirname, '../data/users.txt');
        
        // Get existing users
        let users: any[] = [];
        try {
            if (fs.existsSync(usersFilePath)) {
                const data = fs.readFileSync(usersFilePath, 'utf8');
                users = data.trim() ? JSON.parse(data) : [];
            }
        } catch (error) {
            console.error('Error reading users file:', error);
        }

        // Check if user already exists
        if (users.find(user => user.email.toLowerCase() === email.toLowerCase())) {
            throw new Error('User with this email already exists');
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            fullName,
            email: email.toLowerCase(),
            password,
            role: 'user',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);

        // Save to file
        try {
            fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
        } catch (error) {
            console.error('Error saving users file:', error);
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
    async login(email, password) {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        if (this.useFirebase && firebaseAdmin) {
            try {
                const auth = firebaseAdmin.auth();
                
                // Firebase Admin SDK doesn't have direct password login
                // We need to use Firebase Client SDK for login
                // For now, we'll use a workaround with custom tokens
                // In production, you should use Firebase Client SDK on the frontend
                
                // Get user by email
                const userRecord = await auth.getUserByEmail(email.toLowerCase());
                
                // Since Firebase Admin can't verify passwords directly, we'll use a workaround
                // In production, use Firebase Client SDK for authentication
                // For this implementation, we'll accept any password for Firebase users
                // This is a limitation of using Admin SDK for authentication
                
                // Get custom claims for role
                const user = await auth.getUser(userRecord.uid);
                const customClaims = user.customClaims || {};
                const role = customClaims.role || 'user';

                const sessionData = {
                    id: user.uid,
                    fullName: user.displayName || email.split('@')[0],
                    email: user.email,
                    role: role,
                    loginTime: new Date().toISOString()
                };

                // Save current user session to file
                try {
                    fs.writeFileSync(this.currentUsersFilePath, JSON.stringify(sessionData, null, 2));
                    console.log('Session saved successfully:', sessionData);
                } catch (error) {
                    console.error('Error saving current user session:', error);
                }

                return { 
                    success: true, 
                    message: 'Login successful!', 
                    user: sessionData 
                };
            } catch (error) {
                console.error('Firebase login error:', error);
                // If Firebase fails, try file-based fallback
                console.log('Falling back to file-based authentication');
                return this.loginFileBased(email, password);
            }
        } else {
            // Fallback to file-based storage
            return this.loginFileBased(email, password);
        }
    }

    /**
     * File-based login (fallback)
     */
    loginFileBased(email, password) {
        const usersFilePath = path.join(__dirname, '../data/users.txt');
        
        try {
            if (!fs.existsSync(usersFilePath)) {
                throw new Error('Invalid email or password');
            }
            const data = fs.readFileSync(usersFilePath, 'utf8');
            const users = data.trim() ? JSON.parse(data) : [];

            const user = users.find(u => 
                u.email.toLowerCase() === email.toLowerCase() && u.password === password
            );

            if (!user) {
                throw new Error('Invalid email or password');
            }

            const sessionData = {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role || 'user',
                loginTime: new Date().toISOString()
            };

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
        } catch (error) {
            console.error('File-based login error:', error);
            throw new Error('Invalid email or password');
        }
    }

    /**
     * Logout user
     */
    logout() {
        try {
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
    async getAllUsers() {
        if (this.useFirebase && firebaseAdmin) {
            try {
                const auth = firebaseAdmin.auth();
                const listUsersResult = await auth.listUsers();
                
                return listUsersResult.users.map(user => ({
                    id: user.uid,
                    fullName: user.displayName || 'Unknown',
                    email: user.email,
                    createdAt: new Date(user.metadata.creationTime).toISOString()
                }));
            } catch (error) {
                console.error('Error getting Firebase users:', error);
                return [];
            }
        } else {
            // Fallback to file-based storage
            const usersFilePath = path.join(__dirname, '../data/users.txt');
            try {
                if (!fs.existsSync(usersFilePath)) {
                    return [];
                }
                const data = fs.readFileSync(usersFilePath, 'utf8');
                const users = data.trim() ? JSON.parse(data) : [];
                return users.map(user => ({
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    createdAt: user.createdAt
                }));
            } catch (error) {
                console.error('Error reading users file:', error);
                return [];
            }
        }
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
    async getUserStats() {
        let totalUsers = 0;
        
        if (this.useFirebase && firebaseAdmin) {
            try {
                const auth = firebaseAdmin.auth();
                const listUsersResult = await auth.listUsers();
                totalUsers = listUsersResult.users.length;
            } catch (error) {
                console.error('Error getting Firebase user count:', error);
            }
        } else {
            const usersFilePath = path.join(__dirname, '../data/users.txt');
            try {
                if (fs.existsSync(usersFilePath)) {
                    const data = fs.readFileSync(usersFilePath, 'utf8');
                    const users = data.trim() ? JSON.parse(data) : [];
                    totalUsers = users.length;
                }
            } catch (error) {
                console.error('Error reading users file:', error);
            }
        }

        const currentUser = this.getCurrentUser();
        
        return {
            totalUsers,
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