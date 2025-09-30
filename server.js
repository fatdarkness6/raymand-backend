import app from './src/app.js';
import connectDB from './src/utils/db.js';
import dotenv from 'dotenv';
dotenv.config();


const PORT = process.env.PORT || 8080;
connectDB();
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));