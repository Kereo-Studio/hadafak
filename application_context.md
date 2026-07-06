# HADEF Backend - Core Application Context

This document is the source of truth for the modules, features, technical architecture, and optimization practices of the HADEF Fitness Application.

## 1. Feature Map & Current Progress

| Module / Feature | Status | Description |
| :--- | :--- | :--- |
| **Authentication & Users** | ✅ Done | Register, Login, Refresh token, JWT authorization guards, Google OAuth integration. |
| **Profiles System** | ✅ Done | User fitness goals, training level, session duration preferences, equipment access (none, home, gym), and injury restrictions. |
| **Gym Program Creation & Generation** | ✅ Done | Dynamic template-based workout programs (Push/Pull/Legs, Upper/Lower, Full Body splits) generated for users based on their profile data. |
| **Workouts Tracker & Adaptation** | ✅ Done | Active workout session logging (sets, reps, weight, RPE/fatigue rating, and difficulty feedback) integrated with an **Adaptation Engine** that automatically adjusts workout target reps/sets/weights based on session performance. |
| **Calories & Nutrition Tracking** | ✅ Done | Food catalog database, user custom foods, daily nutrition summaries (macros, calories, water tracking). |
| **Steps Tracking** | ✅ Done | Real-time interval step sync, daily summary aggregation, dynamic profile-based stride/calorie estimations, and user step streaks. |
| **Recipes Library** | ✅ Done | Custom recipes, AI-Powered generator ("What's in my Fridge?"), ingredient substitution, and bulk imports from external API providers (TheMealDB). |
| **Fitness Products Marketplace**| 💤 Postponed | E-commerce features postponed in favor of core fitness tracking depth. |
| **Body Progress & Photo Logger**| ⏳ Planned | Weight history, body circumference logs, and visual progress photo storage. |

---

## 2. Technical Stack & Infrastructure
*   **Backend Framework**: NestJS (v10+ / TypeScript)
*   **Database**: PostgreSQL
*   **ORM**: TypeORM (Data Mapper pattern)
*   **Documentation**: Swagger (OpenAPI) accessible locally at `/docs`
*   **Deployment**: AWS (ECS/Fargate with Application Load Balancer)

---

## 3. High-Performance Design Patterns

The codebase is optimized for low database latency and minimal server load through the following design patterns:

### A. Batch Transactions & Bulk Operations (Anti N+1 Query Pattern)
*   **Steps Syncing**: Aggregates and batch-processes raw step logs, modifying daily step records in bulk rather than sequentially in loops.
*   **Program & Plan Generation**: Generates program days and exercise targets as memory arrays first, and inserts them using TypeORM bulk-save operations (`save([...])`), reducing 30+ DB queries down to exactly 2.
*   **Workout Performance Logs**: Bulk-inserts session exercises on completion.

### B. Parallel Execution & Pre-fetching
*   **Adaptation Engine**: When a workout session is logged, all required entities (user profile, target workout plan, program day exercises) are pre-fetched in parallel using `Promise.all` and passed down to the rules evaluator. The evaluation calls run concurrently rather than sequentially.

---

## 4. Key Integration & API Examples

### Recipe Importing API
You can fetch and import recipes dynamically from external providers (e.g. `TheMealDB`) using the endpoint below:

```bash
curl -X POST http://hadafak-production-alb-792020520.eu-central-1.elb.amazonaws.com/api/v1/recipe-import/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>" \
  -d '{
    "provider": "TheMealDB",
    "limit": 10,
    "query": "chicken",
    "skipDuplicates": true,
    "similarityThreshold": 0.75
  }'
```