import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import apiRouter from './routes/index.js';
import { registerSocketHandlers } from './services/socketService.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: true }));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/api', apiRouter);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const allowedOrigins = ['http://localhost:3000'];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});


registerSocketHandlers(io);

const PORT = process.env.PORT || 5050;

(async function bootstrap() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safespot');
    server.listen(PORT, () => console.log(`SafeSpot server running on ${PORT}`));
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
})();
