import express from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import { UserManager } from '../services/userManager.js';
const router = express.Router();
const userManager = new UserManager();
// Admin middleware for specific routes
const adminMiddleware = (req, res, next) => {
    const currentUser = userManager.getCurrentUser();
    if (!currentUser || (currentUser.role || 'user') !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};
const allowedTypes = ['signup', 'login', 'booking'];
router.get('/summary', (req, res) => {
    try {
        const summary = AnalyticsService.getSummary();
        res.json({ success: true, data: summary });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load analytics summary' });
    }
});
router.get('/events', (req, res) => {
    try {
        const type = req.query.type;
        const limit = Number(req.query.limit) || 100;
        if (type && !allowedTypes.includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid event type' });
        }
        const events = AnalyticsService.getRecentEvents(type, limit);
        res.json({ success: true, data: { events } });
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to record analytics event' });
    }
});
/**
 * Download booking report as CSV (admin only)
 */
router.get('/bookings/download', adminMiddleware, (req, res) => {
    try {
        const events = AnalyticsService.getRecentEvents('booking', 10000);
        if (events.length === 0) {
            return res.status(404).json({ success: false, message: 'No booking data available' });
        }
        // Generate CSV content
        const headers = ['ID', 'Timestamp', 'User Name', 'User Email', 'From', 'To', 'Transport', 'Provider', 'Date', 'Passengers'];
        const csvRows = [headers.join(',')];
        events.forEach(event => {
            const meta = event.metadata || {};
            const row = [
                event.id,
                event.timestamp,
                `"${event.userName || 'Unknown'}"`,
                `"${event.userEmail || 'Unknown'}"`,
                `"${meta.from || 'Unknown'}"`,
                `"${meta.to || 'Unknown'}"`,
                `"${meta.transport || 'Unknown'}"`,
                `"${meta.provider || 'Unknown'}"`,
                `"${meta.date || 'Unknown'}"`,
                meta.passengers || '1'
            ];
            csvRows.push(row.join(','));
        });
        const csvContent = csvRows.join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="bookings-report-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate booking report' });
    }
});
export default router;
