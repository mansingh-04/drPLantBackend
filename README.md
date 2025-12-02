# 🌿 Dr Plant – Intelligent Care for Your Green Friends  
*A smart, AI-powered plant management system that helps users track, analyze, and care for their plants with ease.*

---

## 📌 Overview

**Dr Plant** is a full-stack web application built with a clean and modular architecture.  
It provides users with an intuitive UI to manage plant profiles, track care logs, analyze plant images for diseases, and generate personalized AI-powered care tips.

The project is structured into a **React frontend** and a **Node.js/Express backend**, connected through PostgreSQL with Prisma ORM.  
This separation ensures scalability, maintainability, and clarity throughout the codebase.

---
# 🌱 Key Features

### 🔐 Authentication
- Signup with hashed password  
- JWT-based login  
- Protected routes using middleware  
- Frontend maintains session with AuthContext  

---

### 🌿 Plant Management (CRUD)
- Add a plant with name, species, and image  
- View all plants  
- Update plant information  
- Delete plant and logs  
- Fetch stored plant images  

---

### 📊 Plant Logs
Each plant has logs for:
- Watering  
- Fertilizer updates  
- Growth tracking  
- Health observations  

These logs build a complete care timeline.

---

### 🤖 AI-Powered Features

#### **1. Plant Identification**
- Upload plant image  
- Backend sends to Plant.id (API)
- AI predicts:
  - Plant species  
  - Plant or not
  - Possible disease  

#### **2. Personalized Care Tips (Gemini AI)**
Gemini uses:
- Species  
- Disease info  
- User logs  

To generate structured JSON with:
- Watering instructions  
- Fertilizer schedules  
- Seasonal care  
- Treatment suggestions  


🚀 Live URLs

🔹 Frontend (Client App)
👉 [Click Me](https://dr-plant-one.vercel.app/)

🔹 Backend API
👉 [Click Me](https://drplantbackend.onrender.com)

🔹 Frontend GitHub Repo 
👉 [Click Me](https://github.com/mansingh-04/Dr.Plant)

🔹 Backend GitHub Repo 
👉 [Click Me](https://github.com/mansingh-04/drPLantBackend)
