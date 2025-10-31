'use strict';

import path from 'path';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import passport from 'passport';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { ensureAuthenticated } from './utils/auth.js';
import './utils/passport.js';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import emailRoutes from './routes/emails.js';
import { startPoller } from './workers/poller.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parsers
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// CORS for dev
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:4200';
app.use(
	cors({
		origin: allowedOrigin,
		credentials: true,
	})
);

// Mongo connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/email_reader_app';
mongoose.set('strictQuery', true);
mongoose
	.connect(mongoUri)
	.then(() => {
		console.log('Connected to MongoDB');
	})
	.catch((err) => {
		console.error('MongoDB connection error', err);
		process.exit(1);
	});

// Session
app.use(
	session({
		secret: process.env.SESSION_SECRET || 'dev_secret',
		resave: false,
		saveUninitialized: false,
		store: MongoStore.create({ mongoUrl: mongoUri }),
		cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, sameSite: 'lax' },
	})
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Health
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/api/categories', ensureAuthenticated, categoryRoutes);
app.use('/api/emails', ensureAuthenticated, emailRoutes);

// Poller (import + archive)
startPoller();

// Serve Angular in production (expects build at frontend/dist/frontend)
const distPath = path.join(__dirname, '..', 'frontend', 'dist', 'frontend');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
	app.use(express.static(distPath));
	app.use((req, res, next) => {
		if (req.method !== 'GET') return next();
		if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
		res.sendFile(path.join(distPath, 'index.html'));
	});
} else {
	console.log('Angular dist not found; skipping static serve. Use FRONTEND_ORIGIN and run Angular dev server.');
}

// Error handler
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ error: err?.message || 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running at ${process.env.BASE_URL || 'http://localhost:' + PORT}`);
});
