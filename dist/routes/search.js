import express from 'express';
import { AggregationService } from '../services/aggregationService.js';
const router = express.Router();
// Basic validation middleware
const validateSearchRequest = (req, res, next) => {
    const { from, to, date } = req.query;
    if (!from || !to || !date) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameters: from, to, date'
        });
    }
    next();
};
router.get('/', validateSearchRequest, async (req, res, next) => {
    try {
        const searchParams = {
            from: req.query.from,
            to: req.query.to,
            date: req.query.date,
            returnDate: req.query.returnDate,
            flightClass: req.query.flightClass,
            trainClass: req.query.trainClass
        };
        console.log('Search request:', searchParams);
        const result = await AggregationService.searchTravelOptions(searchParams);
        if (!result.success && result.errors?.length) {
            return res.status(400).json(result);
        }
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get('/status', async (req, res, next) => {
    try {
        const providerStatus = await AggregationService.getProviderStatus();
        res.json({
            success: true,
            data: {
                providers: providerStatus,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        }
    });
});
export default router;
