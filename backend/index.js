require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const NodeStl = require('node-stl');

const app = express();
const port = process.env.PORT || 5000;

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
  res.send('🔥 HIVE.AI 3D Slicer Backend - Production Ready (In-Memory Mode)');
});

// REAL VOLUME CALCULATION
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const filePath = path.join(__dirname, 'uploads', req.file.filename);
  const stlBuffer = fs.readFileSync(filePath);
  const stl = new NodeStl(stlBuffer);
  
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

// In-memory data store for temporary production use without MongoDB
let users = [];
let posts = [];

// AUTH STUB
app.post('/api/auth/temp', async (req, res) => {
  const { email, name } = req.body;
  let user = users.find(u => u.email === email);
  if (!user) {
    user = { _id: Date.now().toString(), name, email, credits: 100 };
    users.push(user);
  }
  res.json(user);
});

// --- RAZORPAY PAYMENT ENDPOINTS ---
app.post('/api/payments/order', async (req, res) => {
  const { amount, currency = 'INR' } = req.body;
  
  const options = {
    amount: amount * 100,
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
    const user = users.find(u => u._id === userId);
    if (user) {
      user.credits += parseInt(creditsToAdd);
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
  const user = users.find(u => u._id === userId);
  res.json({ userId, credits: user ? user.credits : 0 });
});

app.post('/task', async (req, res) => {
  const { userId, taskName, cost } = req.body;
  
  const user = users.find(u => u._id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  if (user.credits < cost) {
    return res.status(403).json({ error: 'Insufficient HIVE Coins' });
  }
  
  user.credits -= cost;

  const processingTime = taskName === 'Vision-to-Mesh' ? 5000 : 2000;
  
  setTimeout(() => {
    console.log(`[HIVE AI] Completed ${taskName} for user ${user.email}`);
  }, processingTime);

  res.json({
    message: `HIVE AI: '${taskName}' Task Initiated. Processing...`,
    deducted: cost,
    remainingCredits: user.credits,
    status: 'Processing',
    estimatedTime: `${processingTime/1000}s`
  });
});

// --- COMMUNITY FEED ---
app.get('/community-feed', async (req, res) => {
  res.json(posts.slice().sort((a, b) => b.timestamp - a.timestamp));
});

app.post('/community/add', async (req, res) => {
  const { user, title, content } = req.body;
  const newPost = { id: Date.now(), user, title, content, timestamp: Date.now() };
  posts.push(newPost);
  res.json({ message: 'Post added to community feed', post: newPost });
});

app.listen(port, () => {
  console.log(`🔥 HIVE.AI 3D Slicer running at http://localhost:${port}`);
});
