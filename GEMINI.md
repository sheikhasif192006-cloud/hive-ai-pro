# HIVE.AI Project Instructions

## Architecture
- **Frontend:** React + Three.js + Tailwind CSS (Cyberpunk + Neumorphism Theme).
- **Backend:** Node.js + Express + MongoDB (Atlas).
- **Payment:** Razorpay Integration for HIVE COINS (Credit System).

## Workflow
- **Monetization:** Pay-per-use model using HIVE COINS.
- **Credits:** Deducted via `/task` endpoint for AI tasks (Vision-to-Mesh, Organic Supports) and Slicing.
- **Deployment:** 
  - Backend: Render.com (Root: `backend`)
  - Frontend: Vercel.com (Root: `frontend`)

## Deployment Status
- **GitHub Repository:** [https://github.com/sheikhasif192006-cloud/hive-ai-pro](https://github.com/sheikhasif192006-cloud/hive-ai-pro)
- **Backend (Render):** Ready to connect. Root: `backend`.
- **Frontend (Vercel):** Ready to connect. Root: `frontend`.

## Conventions
- Use `cyber-card` and `cyber-glow` classes for UI consistency.
- Environment variables must be updated in `.env.example` before pushing changes.
- **Production Tip:** When Render backend is live, update `VITE_API_URL` in Vercel.
