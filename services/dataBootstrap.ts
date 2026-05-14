import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserManager } from './userManager.js';
import { AnalyticsService } from './analyticsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resetEphemeralData() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Drop runtime data so it does not persist across server restarts
    const filesToRemove = [
        path.join(dataDir, 'analytics_events.json'),
        path.join(dataDir, 'current_user.txt'),
        path.join(dataDir, 'users.txt')
    ];

    filesToRemove.forEach(file => {
        if (fs.existsSync(file)) {
            try {
                fs.unlinkSync(file);
            } catch (error) {
                console.error('Failed to remove data file:', file, error);
            }
        }
    });
}

/**
 * Bootstraps on-disk data stores; state is cleared each start for an ephemeral runtime.
 */
export function bootstrapDataStores() {
    // Always clear runtime data so state does not persist between server runs
    resetEphemeralData();

    // Ensure users and current session files exist
    const userManager = new UserManager();
    const users = userManager.getAllUsers();
    const currentUser = userManager.getCurrentUser();

    // Ensure analytics store exists and report counts
    const analyticsSnapshot = AnalyticsService.init();

    return {
        usersCount: users.length,
        currentUserEmail: currentUser?.email || null,
        analytics: analyticsSnapshot
    };
}
