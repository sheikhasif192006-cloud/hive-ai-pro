require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const NodeStl = require('node-stl');
const sharp = require('sharp');

// Models
const User = require('./models/User');
const Post = require('./models/Post');

const app = express();
const port = process.env.PORT || 5000;

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected: HIVE.AI Database is Live'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Razorpay Setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
  res.send('🔥 HIVE.AI 3D Slicer Backend - Production Ready');
});

// AUTH STUB (For now, we'll use a hardcoded user or create one if not exists)
app.post('/api/auth/temp', async (req, res) => {
  const { email, name } = req.body;
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ name, email, password: 'hashed_password_stub' });
    await user.save();
  }
  res.json(user);
});

// REAL VOLUME CALCULATION
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const filePath = path.join(__dirname, 'uploads', req.file.filename);
  const stlBuffer = fs.readFileSync(filePath);
  const stl = new NodeStl(stlBuffer);
  console.log('[DEBUG] STL Object Keys:', Object.keys(stl));
  
  const volumeCC = stl.volume; // cubic mm
  const volumeML = (volumeCC / 1000).toFixed(2);
  
  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    volumeMM3: volumeCC.toFixed(2),
    volumeML: volumeML,
    triangles: stl.triangles ? stl.triangles.length : 0,
    status: 'STL Loaded Successfully'
  });
});

// --- RAZORPAY PAYMENT ENDPOINTS ---
app.post('/api/payments/order', async (req, res) => {
  const { amount, currency = 'INR' } = req.body;
  
  const options = {
    amount: amount * 100, // amount in the smallest currency unit (paise)
    currency,
    receipt: `receipt_${Date.now()}`
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, creditsToAdd } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature === expectedSign) {
    // Update User Credits
    const user = await User.findById(userId);
    if (user) {
      user.credits += parseInt(creditsToAdd);
      await user.save();
      return res.json({ message: "Payment verified successfully", credits: user.credits });
    }
    res.status(404).json({ error: "User not found" });
  } else {
    res.status(400).json({ error: "Invalid signature" });
  }
});

// --- HIVE COINS SYSTEM ---
app.get('/credits/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    res.json({ userId, credits: user ? user.credits : 0 });
  } catch (e) {
    res.status(404).json({ error: 'User not found' });
  }
});

app.post('/task', async (req, res) => {
  const { userId, taskName, cost } = req.body;
  
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.credits < cost) {
      return res.status(403).json({ error: 'Insufficient HIVE Coins' });
    }
    
    user.credits -= cost;
    await user.save();

    // Simulate AI Processing Delay in background
    const processingTime = taskName === 'Vision-to-Mesh' ? 5000 : 2000;
    
    setTimeout(async () => {
      // In a real app, this would trigger a background worker (e.g., Python/Celery)
      console.log(`[HIVE AI] Completed ${taskName} for user ${user.email}`);
    }, processingTime);

    res.json({
      message: `HIVE AI: '${taskName}' Task Initiated. Processing...`,
      deducted: cost,
      remainingCredits: user.credits,
      status: 'Processing',
      estimatedTime: `${processingTime/1000}s`
    });
  } catch (e) {
    res.status(500).json({ error: 'Task processing failed' });
  }
});

// --- COMMUNITY FEED ---
app.get('/community-feed', async (req, res) => {
  const posts = await Post.find().sort({ timestamp: -1 });
  res.json(posts);
});

app.post('/community/add', async (req, res) => {
  const { user, title, content } = req.body;
  const newPost = new Post({ user, title, content });
  await newPost.save();
  res.json({ message: 'Post added to community feed', post: newPost });
});

app.listen(port, () => {
  console.log(`🔥 HIVE.AI 3D Slicer running at http://localhost:${port}`);
});

