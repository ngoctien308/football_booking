import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/authRoutes.js';
import fieldRoutes from './src/routes/fieldRoutes.js';
import reviewRoutes from './src/routes/reviewRoutes.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import messageRoutes from './src/routes/messageRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import serviceRoutes from './src/routes/serviceRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services', serviceRoutes);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

    
