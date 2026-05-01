# HIVE.AI Deployment Guide 🚀

This document outlines the steps to deploy the HIVE.AI 3D Slicer platform to production.

## 1. Backend (Node.js/Express)
*   **Platform:** [Render](https://render.com/) or [Railway](https://railway.app/).
*   **Database:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
*   **Environment Variables:**
    *   `PORT=5000`
    *   `MONGODB_URI`: Your MongoDB Atlas connection string.
    *   `RAZORPAY_KEY_ID`: Production key from Razorpay Dashboard.
    *   `RAZORPAY_KEY_SECRET`: Production secret from Razorpay Dashboard.
    *   `JWT_SECRET`: A long, random string.

## 2. Frontend (React/Vite)
*   **Platform:** [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).
*   **Build Command:** `npm run build`
*   **Output Directory:** `dist`
*   **Environment Variables:**
    *   `VITE_API_URL`: The URL of your deployed backend.
    *   `VITE_RAZORPAY_KEY_ID`: Your Razorpay production key.

## 3. Post-Deployment Steps
1.  Update the `VITE_API_URL` in your frontend settings.
2.  Add your production domain to the **Razorpay Allowed Domains** list in the Razorpay Dashboard.
3.  Ensure the `uploads/` directory on the backend is persistent (if not using cloud storage like S3). *Note: Render/Heroku have ephemeral filesystems; consider moving to AWS S3 for file storage.*

## 4. Scaling
*   For the **Vision-to-Mesh** and **Organic Supports** tasks, consider moving logic to a separate Python worker using **Redis/BullMQ** if traffic increases.
