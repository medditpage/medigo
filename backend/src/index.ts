// backend/index
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import orderRoutes from './routes/order.routes';
import agentRoutes from './routes/agent.routes';
import adminRoutes from './routes/admin.routes';
import { startCronJobs } from './jobs/cron';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(helmet());
app.use(
cors({
origin: process.env.FRONTEND_URL?.split(',') || '*',
credentials: true,
})
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.get('/health', (_req: Request, res: Response) => {
res.json({ status: 'ok', service: 'Medzink API', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use((_req: Request, res: Response) => {
res.status(404).json({ error: 'Route not found' });
});
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
console.error('Unhandled error:', err);
res.status(err.status || 500).json({
error: err.message || 'Internal server error',
});
});
app.listen(PORT, () => {
console.log(`Medzink backend running on port ${PORT}`);
startCronJobs();
});
export default app;