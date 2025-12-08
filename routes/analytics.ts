import express from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import type { AnalyticsEventType } from '../types/index.js';

const router = express.Router();

const allowedTypes: AnalyticsEventType[] = ['signup', 'login', 'booking'];

router.get('/summary', (req, res) => {
    try {
        const summary = AnalyticsService.getSummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load analytics summary' });
    }
});

router.get('/events', (req, res) => {
    try {
        const type = req.query.type as AnalyticsEventType | undefined;
        const limit = Number(req.query.limit) || 100;

        if (type && !allowedTypes.includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid event type' });
        }

        const events = AnalyticsService.getRecentEvents(type, limit);
        res.json({ success: true, data: { events } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load analytics events' });
    }
});

router.post('/events', (req, res) => {
    try {
        const { type, userEmail, userName, metadata } = req.body;

        if (!type || !allowedTypes.includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid event type' });
        }

        const event = AnalyticsService.logEvent({ type, userEmail, userName, metadata });
        res.json({ success: true, data: { event } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to record analytics event' });
    }
});

export default router;
