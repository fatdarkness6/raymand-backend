import express from 'express';
import cors from 'cors';
import contactRoutes from './routes/contactRoutes.js';

const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.use('/contact', contactRoutes);

export default app;
