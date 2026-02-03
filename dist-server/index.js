import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateRouter } from './routes/generate';
import { stylesRouter } from './routes/styles';
import { pricingRouter } from './routes/pricing';
const app = express();
const PORT = process.env.PORT || 3001;
// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178'],
    credentials: true,
};
// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
// Routes
app.use('/api/generate-image', generateRouter);
app.use('/api/styles', stylesRouter);
app.use('/api/pricing', pricingRouter);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map