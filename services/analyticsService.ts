import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AnalyticsEvent, AnalyticsEventType, AnalyticsSummary } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVENTS_FILE = path.join(__dirname, '../data/analytics_events.json');

export class AnalyticsService {
    private static ensureStore() {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        if (!fs.existsSync(EVENTS_FILE)) {
            fs.writeFileSync(EVENTS_FILE, '[]');
        }
    }

    /**
     * Initialize analytics store on server startup
     */
    static init() {
        this.ensureStore();
        // Return a quick snapshot for logging
        const events = this.readEvents();
        return {
            totalEvents: events.length,
            byType: {
                signup: events.filter(e => e.type === 'signup').length,
                login: events.filter(e => e.type === 'login').length,
                booking: events.filter(e => e.type === 'booking').length,
            }
        };
    }

    private static readEvents(): AnalyticsEvent[] {
        this.ensureStore();
        try {
            const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
            return raw.trim() ? JSON.parse(raw) : [];
        } catch (error) {
            console.error('Failed to read analytics events store:', error);
            return [];
        }
    }

    private static writeEvents(events: AnalyticsEvent[]) {
        this.ensureStore();
        try {
            fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
        } catch (error) {
            console.error('Failed to write analytics events store:', error);
        }
    }

    static logEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'> & { timestamp?: string }) {
        const events = this.readEvents();
        const record: AnalyticsEvent = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: event.timestamp || new Date().toISOString(),
            type: event.type,
            userEmail: event.userEmail,
            userName: event.userName,
            metadata: event.metadata || {}
        };

        events.push(record);
        this.writeEvents(events);

        return record;
    }

    static getRecentEvents(type?: AnalyticsEventType, limit = 100): AnalyticsEvent[] {
        const events = this.readEvents();
        const filtered = type ? events.filter(event => event.type === type) : events;
        return filtered
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
    }

    static getSummary(): AnalyticsSummary {
        const events = this.readEvents();
        const counts = {
            signups: events.filter(e => e.type === 'signup').length,
            logins: events.filter(e => e.type === 'login').length,
            bookings: events.filter(e => e.type === 'booking').length
        };

        const uniqueUsers = new Set(events.map(e => e.userEmail).filter(Boolean)).size;

        const recent = {
            signups: this.getRecentEvents('signup', 5),
            logins: this.getRecentEvents('login', 5),
            bookings: this.getRecentEvents('booking', 8)
        };

        return {
            counts,
            uniqueUsers,
            recent,
            lastUpdated: new Date().toISOString()
        };
    }
}
