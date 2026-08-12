# Hadafak (هدفَك) 🎯

> **Hadafak** is a full-stack, AI-powered fitness, nutrition, and workout adaptation platform. It helps users achieve their health goals through dynamic workout program generation, adaptive exercise volume scaling, comprehensive food and macro tracking (including a specialized Egyptian food library), AI recipe generation, real-time step counting, and an interactive AI fitness coach.

---

## 🏗️ Repository Architecture

The project is organized as a monorepo containing three core components:

```
hadafak/
├── hadafak-app/       # Cross-platform Mobile Application (Expo / React Native)
├── hadafak-backend/   # Backend REST API Service (NestJS / TypeORM / PostgreSQL)
└── infra/             # Cloud Infrastructure as Code (AWS ECS / ALB / S3 / Terraform)
```

---

## ✨ Key Features

### 🏋️‍♂️ Fitness & Adaptive Workouts
- **Personalized Program Generation**: Automatically creates tailored workout splits (Push/Pull/Legs, Upper/Lower, Full Body) based on user goals, training level, duration preferences, and available equipment (Gym, Home, Bodyweight).
- **Workout Performance Tracker**: Track sets, reps, weight, RPE (rate of perceived exertion), and fatigue ratings during active workout sessions.
- **Adaptive Performance Engine**: Automatically analyzes completed workouts and adjusts target reps, sets, and weights for upcoming sessions based on past performance and fatigue feedback.

### 🥗 Nutrition & Recipe Engine
- **Comprehensive Food Library**: Includes an 830+ Egyptian and international food database with detailed macro-nutritional values (calories, protein, carbs, fat per 100g).
- **Macro & Calorie Tracker**: Track daily caloric intake, macronutrient distribution, custom food items, and daily water consumption.
- **AI Recipe Generator ("What's in my Fridge?")**: Uses Google Gemini AI to generate healthy recipes tailored to ingredients available in the user's kitchen.
- **External Recipe Import Pipeline**: Automated integration with external meal providers (e.g. *TheMealDB*) with automated normalization, ingredient-to-food linking, and macro calculations.

### 👟 Step & Activity Tracking
- **Real-Time Step Counter**: Integrates with mobile device motion sensors and background services to track daily steps, active distance, and burned calories.
- **Streak & Summary Analytics**: Maintains daily step streaks and activity history.

### 🤖 Interactive AI Fitness Coach
- **Context-Aware AI Assistant**: Chat with an AI coach that remembers user injuries, avoided foods, fitness goals, and preferences to provide personalized guidance.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Mobile App (`hadafak-app`)** | React Native, Expo, TypeScript, React Navigation, Lucide Icons, Expo Sensors |
| **Backend (`hadafak-backend`)** | NestJS, TypeScript, TypeORM, PostgreSQL (Neon Serverless), Swagger / OpenAPI (`/docs`) |
| **AI Integration** | Google Gemini 2.5 Flash API |
| **External APIs** | FatSecret API, TheMealDB |
| **Infrastructure (`infra`)** | Terraform, AWS ECS Fargate, Application Load Balancer (ALB), AWS ECR, AWS S3 |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ or v20+
- **JDK**: Java 21 (from Android Studio or OpenJDK 21)
- **Android Studio & SDK**: Android API Level 34+
- **PostgreSQL Database**: Local instance or Neon Serverless PostgreSQL connection string

---

### 1. Setting Up the Backend (`hadafak-backend`)

```bash
# Navigate to backend directory
cd hadafak-backend

# Install dependencies
npm install

# Configure environment variables (copy .env.example to .env and set DATABASE_URL)
cp .env.example .env

# Run database migrations
npm run migration:run

# Seed initial exercises and Egyptian food library
npm run db:seed

# Start the server in development mode
npm run start:dev
```
- API Base Endpoint: `http://localhost:3000/api/v1`
- Interactive API Documentation (Swagger): `http://localhost:3000/docs`

---

### 2. Setting Up the Mobile App (`hadafak-app`)

```bash
# Navigate to mobile app directory
cd hadafak-app

# Install dependencies
npm install

# Configure API URL in .env
# EXPO_PUBLIC_API_URL=http://<YOUR_BACKEND_IP_OR_ALB>:3000/api/v1

# Start the Expo development server
npm start
```
- To compile a release Android APK:
  ```bash
  cd android
  JAVA_HOME=/opt/android-studio/jbr ANDROID_HOME=~/Android/Sdk ./gradlew assembleRelease
  ```

---

### 3. Deploying Cloud Infrastructure (`infra`)

```bash
# Navigate to infrastructure directory
cd infra

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply infrastructure deployment to AWS
terraform apply
```

---

## 🔒 Environment Variables

### Backend (`hadafak-backend/.env`)
```env
PORT=3000
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
JWT_SECRET=your-secure-jwt-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
GEMINI_API_KEY=your-gemini-api-key
FATSECRET_CLIENT_ID=your-fatsecret-client-id
FATSECRET_CLIENT_SECRET=your-fatsecret-client-secret
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_S3_REGION=eu-central-1
```

### App (`hadafak-app/.env`)
```env
EXPO_PUBLIC_API_URL=http://<your-alb-or-domain>/api/v1
```

---

## 📜 License
Private & Proprietary - **Hadafak Team**.
