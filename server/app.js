const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const labRoutes = require('./routes/labRoutes');
const testBookingRoutes = require('./routes/testBookingRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const ambulanceRoutes = require('./routes/ambulanceRoutes');

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://medisphere-frontend-cbcg.onrender.com'
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'MediSphere API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/records', medicalRecordRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/test-bookings', testBookingRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ambulance', ambulanceRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;