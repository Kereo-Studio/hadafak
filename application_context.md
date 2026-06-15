# HADEF Backend - Core Application Context

This document is the source of truth for the modules, features, and implementation roadmap of the HADEF Fitness Application.

## 1. Feature Map & Current Progress

| Module / Feature | Status | Description |
| :--- | :--- | :--- |
| **Authentication & Users** | ✅ Done | Register, Login, Refresh token, JWT authorization guards. |
| **Profiles System** | ✅ Done | Fitness goals, personal stats, auto daily calorie/water calculations. |
| **Gym Program Creation** | ✅ Done | Workouts templates, program days, exercise targets, automatic program generators. |
| **Workouts Tracker** | ✅ Done | Active logging sessions, sets/reps trackers, PR tracking, history analytics, and chronological progression tracking per exercise. |
| **Calories Tracking** | ✅ Done | Food catalog database, user custom foods, daily nutrition summaries. |
| **Steps Tracking** | ✅ Done | Real-time interval syncing, daily summaries, dynamic profile-based stride/calorie estimations, streaks. |
| **Recipes Library** | ✅ Done | AI-Powered recipe generator ("Whats in my Fridge?"), ingredient substitution, custom user recipes, and database catalog seeding. |
| **Fitness Products Marketplace**| 💤 Postponed| E-commerce features postponed in favor of core fitness tracking depth. |
| **Body Progress & Photo Logger**| ⏳ Planned | Weight history, body circumference logs (waist, biceps, etc.), and visual progress photo storage. |

## 2. Technical Stack
*   **Framework**: NestJS (TypeScript)
*   **Database**: PostgreSQL + TypeORM
*   **Docs**: Swagger (OpenAPI) at `/docs`
curl -X POST http://hadafak-production-alb-792020520.eu-central-1.elb.amazonaws.com/api/v11/recipe-import/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwODNlNjVmZS05NjdiLTQ2NTMtYjMyNS1iZjgyNmFmMzk0NmIiLCJlbWFpbCI6Im1AZ21haWwuY29tIiwiaWF0IjoxNzgxNTQzMDU0LCJleHAiOjE3ODE1NDM5NTR9.0TfffBhNm2wr4TouvZmK1fJ37xvUCakce6v2YgRbbvA
  -d '{
    "provider": "TheMealDB",
    "limit": 10,
    "query": "chicken",
    "skipDuplicates": true,
    "similarityThreshold": 0.75
  }'