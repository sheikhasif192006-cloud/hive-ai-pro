require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const NodeStl = require('node-stl');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');
const axios = require('axios');

// Models
const User = require('./models/User');
const Post = require('./models/Post');
const Transaction = require('./models/Transaction');
const Task = require('./models/Task');

const app = express();
const port = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('📦 Connected to MongoDB Atlas'))
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
  res.send('🔥 HIVE.AI 3D Slicer Backend - Production Ready (MongoDB Mode)');
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

// In-memory data store removed - Using MongoDB

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, credits: user.credits } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, credits: user.credits } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.post('/api/payments/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, creditsToAdd } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      user.credits += parseInt(creditsToAdd);
      await user.save();

      // Log Transaction
      const transaction = new Transaction({
        userId: user._id,
        amount: req.body.amount / 100, // Amount was in paise
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        status: 'completed',
        creditsAdded: creditsToAdd
      });
      await transaction.save();

      return res.json({ message: "Payment verified successfully", credits: user.credits });
    } else {
      res.status(400).json({ error: "Invalid signature" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- HIVE COINS SYSTEM ---
app.get('/credits', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ credits: user ? user.credits : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/task', auth, async (req, res) => {
  try {
    const { taskName, cost, imageUrl } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.credits < cost) {
      return res.status(403).json({ error: 'Insufficient HIVE Coins' });
    }
    
    let externalTaskId = null;
    let status = 'processing';

    // Meshy.ai Integration for Vision-to-Mesh
    if (taskName === 'Vision-to-Mesh' && process.env.MESHY_API_KEY) {
      try {
        const meshyRes = await axios.post('https://api.meshy.ai/openapi/v1/image-to-3d', {
          image_url: imageUrl || 'https://raw.githubusercontent.com/meshyai/meshy-python/main/docs/assets/demo_image.png', // Fallback for testing
          ai_model: 'meshy-4',
          target_formats: ['stl', 'glb']
        }, {
          headers: { 'Authorization': `Bearer ${process.env.MESHY_API_KEY}` }
        });
        externalTaskId = meshyRes.data.result;
      } catch (meshyErr) {
        console.error('Meshy API Error:', meshyErr.response?.data || meshyErr.message);
        return res.status(500).json({ error: 'Failed to initiate AI task' });
      }
    }

    user.credits -= cost;
    await user.save();

    const task = new Task({
      userId: user._id,
      taskName,
      externalTaskId,
      status: externalTaskId ? 'processing' : 'succeeded' // Succeeded if just simulation
    });
    await task.save();

    res.json({
      message: `HIVE AI: '${taskName}' Task Initiated.`,
      deducted: cost,
      remainingCredits: user.credits,
      taskId: task._id,
      status: task.status,
      estimatedTime: taskName === 'Vision-to-Mesh' ? '120s' : '5s'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/task/status/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // If it's a Meshy task and still processing, poll Meshy
    if (task.taskName === 'Vision-to-Mesh' && task.status === 'processing' && task.externalTaskId && process.env.MESHY_API_KEY) {
      const meshyRes = await axios.get(`https://api.meshy.ai/openapi/v1/image-to-3d/${task.externalTaskId}`, {
        headers: { 'Authorization': `Bearer ${process.env.MESHY_API_KEY}` }
      });

      if (meshyRes.data.status === 'SUCCEEDED') {
        task.status = 'succeeded';
        task.resultUrl = meshyRes.data.model_urls.stl;
        task.updatedAt = Date.now();
        await task.save();
      } else if (meshyRes.data.status === 'FAILED') {
        task.status = 'failed';
        task.updatedAt = Date.now();
        await task.save();
      }
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- COMMUNITY FEED ---
app.get('/community-feed', async (req, res) => {
  try {
    const posts = await Post.find().sort({ timestamp: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/community/add', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const user = await User.findById(req.user.id);
    const newPost = new Post({ user: user.name, title, content });
    await newPost.save();
    res.json({ message: 'Post added to community feed', post: newPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🔥 HIVE.AI 3D Slicer running at http://localhost:${port}`);
});
