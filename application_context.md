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
