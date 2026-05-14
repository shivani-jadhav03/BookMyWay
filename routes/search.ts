import express from 'express';
import { AggregationService } from '../services/aggregationService.js';
import type { SearchRequest } from '../types/index.js';

const router = express.Router();

// Basic validation middleware
const validateSearchRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    const searchParams: SearchRequest = {
      from: req.query.from as string,
      to: req.query.to as string,
      date: req.query.date as string,
      returnDate: req.query.returnDate as string | undefined,
      flightClass: req.query.flightClass as string | undefined,
      trainClass: req.query.trainClass as string | undefined
    };

    console.log('Search request:', searchParams);

    const result = await AggregationService.searchTravelOptions(searchParams);

    if (!result.success && result.errors?.length) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
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
  } catch (error) {
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
