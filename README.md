# Hadafak (هدفَك) 🎯

> **Hadafak** is a full-stack, AI-powered fitness, nutrition, and workout adaptation platform. It helps users achieve their health goals through dynamic workout program generation, adaptive exercise volume scaling, comprehensive food and macro tracking (including a specialized Egyptian food library), AI recipe generation, real-time step counting, and an interactive AI fitness coach.

---

## Repository Architecture

The project is organized as a monorepo containing three core components:

```
hadafak/
├── hadafak-app/       # Cross-platform Mobile Application (Expo / React Native)
├── hadafak-backend/   # Backend REST API Service (NestJS / TypeORM / PostgreSQL)
└── infra/             # Cloud Infrastructure as Code (AWS ECS / ALB / S3 / Terraform)
```

---

## Key Features

### Fitness & Adaptive Workouts
- **Personalized Program Generation**: Automatically creates tailored workout splits (Push/Pull/Legs, Upper/Lower, Full Body) based on user goals, training level, duration preferences, and available equipment (Gym, Home, Bodyweight).
- **Workout Performance Tracker**: Track sets, reps, weight, RPE (rate of perceived exertion), and fatigue ratings during active workout sessions.
- **Adaptive Performance Engine**: Automatically analyzes completed workouts and adjusts target reps, sets, and weights for upcoming sessions based on past performance and fatigue feedback.

### Nutrition & Recipe Engine
- **Comprehensive Food Library**: Includes an 830+ Egyptian and international food database with detailed macro-nutritional values (calories, protein, carbs, fat per 100g).
- **Macro & Calorie Tracker**: Track daily caloric intake, macronutrient distribution, custom food items, and daily water consumption.
- **AI Recipe Generator ("What's in my Fridge?")**: Uses Google Gemini AI to generate healthy recipes tailored to ingredients available in the user's kitchen.
- **External Recipe Import Pipeline**: Automated integration with external meal providers (e.g. *TheMealDB*) with automated normalization, ingredient-to-food linking, and macro calculations.

### Step & Activity Tracking
- **Real-Time Step Counter**: Integrates with mobile device motion sensors and background services to track daily steps, active distance, and burned calories.
- **Streak & Summary Analytics**: Maintains daily step streaks and activity history.

### Interactive AI Fitness Coach
- **Context-Aware AI Assistant**: Chat with an AI coach that remembers user injuries, avoided foods, fitness goals, and preferences to provide personalized guidance.

---

## Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Mobile App (`hadafak-app`)** | React Native, Expo, TypeScript, React Navigation, Lucide Icons, Expo Sensors |
| **Backend (`hadafak-backend`)** | NestJS, TypeScript, TypeORM, PostgreSQL (Neon Serverless), Swagger / OpenAPI (`/docs`) |
| **AI Integration** | Google Gemini 2.5 Flash API |
| **External APIs** | FatSecret API, TheMealDB |
| **Infrastructure (`infra`)** | Terraform, AWS ECS Fargate, Application Load Balancer (ALB), AWS ECR, AWS S3 |

---


---
