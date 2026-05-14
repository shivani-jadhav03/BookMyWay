import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import searchRoutes from './routes/search.js';
import authRoutes from './routes/auth.js';
import analyticsRoutes from './routes/analytics.js';
import { UserManager } from './services/userManager.js';
import { bootstrapDataStores } from './services/dataBootstrap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const userManager = new UserManager();

// Bootstrap persisted data on startup
bootstrapDataStores().then(bootstrapInfo => {
  console.log('Data bootstrap:', bootstrapInfo);
}).catch(error => {
  console.error('Data bootstrap failed:', error);
});

// Basic middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000 // higher ceiling; applied only to API routes
});

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files from public directory
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Serve the main index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Serve other HTML pages
app.get('/trains', (req, res) => {
  res.sendFile(path.join(publicDir, 'trains.html'));
});

app.get('/buses', (req, res) => {
  res.sendFile(path.join(publicDir, 'buses.html'));
});

app.get('/flights', (req, res) => {
  res.sendFile(path.join(publicDir, 'flights.html'));
});

app.get('/results', (req, res) => {
  res.sendFile(path.join(publicDir, 'results.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(publicDir, 'signup.html'));
});

app.get('/dashboard', (req, res) => {
    const currentUser = userManager.getCurrentUser();
    if (!currentUser || (currentUser.role || 'user') !== 'admin') {
        return res.status(403).send('<h2>Access denied</h2><p>Admin access required.</p>');
    }
    res.sendFile(path.join(publicDir, 'dashboard.html'));
});

app.use('/api', apiLimiter);
app.use('/api/search', searchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const server = app.listen(PORT, () => {
  console.log(`Travel Comparison Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;
