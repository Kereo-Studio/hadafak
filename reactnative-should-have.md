# HADEF - React Native Frontend Feature Registry

This file documents the frontend UI components, device sensors, and API synchronization logic required in the React Native mobile application to support the backend services.

---

## 1. Steps Tracking System

### Core UI Features
*   **Instant Steps Dashboard Ring**: A circular progress indicator reading directly from the phone's hardware accelerometer (zero-network latency) showing daily steps, target steps, and remaining steps.
*   **Active Streaks Badge**: Visual counter showing consecutive days meeting the step target, featuring a fire icon micro-animation on milestone completion.
*   **Dynamic Metrics Panel**: Cards displaying live estimated distance walked (in km) and active calories burned (in kcal).
*   **Manual Entry Modal**: Simple modal input allowing users without health sensors to manually input step count for any date.
*   **Activity History Chart**: Weekly and monthly bar charts displaying daily steps and goal target lines.

### Client Sync Engine (Throttling & Batching)
*   **Pedometer Sensor Listener**: Access hardware sensors using `expo-sensors` Pedometer or `react-native-sensors`.
*   **Local State Buffer**: Store steps in local storage (e.g., SQLite or MMKV) in 5-15 minute chunks.
*   **Debounced Sync Call**: Triggers a synchronization call to `POST /api/v1/steps/sync` ONLY when:
    1.  The app is opened or closed.
    2.  The user has stopped moving for 2 consecutive minutes.
    3.  A minimum of 10 minutes has passed since the last sync.

---

## 2. Calories & Nutrition Tracking

### Core UI Features
*   **Daily Macro Ring**: A primary ring showing total calories remaining, surrounded by three smaller rings for Protein, Carbs, and Fats.
*   **Daily Hydration Logger**: An interactive water glass element that increments water logging by standard presets (e.g., +250ml, +500ml) with a wave animation.
*   **Meal Section Timeline**: Breakfast, Lunch, Dinner, and Snacks lists detailing logged food items and their respective macros.
*   **Food Catalog Finder**: Tabbed search view:
    *   *Search*: Auto-complete search bar pointing to global/custom database.
    *   *Frequent*: List of the user's most frequently logged foods for single-tap entry.
    *   *Barcode Scanner*: Camera module reading UPC/EAN barcodes to instantly query the database.
*   **Custom Food Creator**: Form allowing users to create personal foods specifying name, macros, and standard serving sizes.

---

## 3. Workouts & Programs Engine

### Core UI Features
*   **Program Explorer**: Grid showing preset programs (e.g., Push Pull Legs, Full Body) with difficulty tags (Beginner, Intermediate) and custom generation buttons.
*   **Active Workout Session Screen (Timer & Sets)**:
    *   Persistent notification bar showing active workout state.
    *   Rest timer count-down with audio/haptic feedback.
    *   Reps and Weight input fields with automatic 1-Rep Max estimations.
*   **Personal Records (PR) Alerts**: Confetti and achievement banners when a user beats their historical weight or volume on an exercise.
*   **Strength Progression Chart**: Interactive line charts displaying historical 1-Rep Max and volume over time, pointing to `GET /api/v1/workouts/stats/progression/:exerciseId`.

---

## 4. AI-Powered Recipes System

### Core UI Features
*   **Recipes Explorer Grid**: Clean grid filtering system to view system catalog, user-created recipes, or AI-generated recipes. Includes badge tags for `High-Protein`, `Keto`, etc.
*   **"What's in my Fridge?" Builder**: An interactive screen where the user selects ingredients they currently have (using visual checkboxes or tags) and hits "Generate AI Recipe".
*   **Servings Scaler & Log Modal**: A sliding selector on the recipe page allowing the user to scale ingredients dynamically (e.g. from 1 serving to 3 servings) and log it directly into their breakfast/lunch/dinner daily logs with one tap.
*   **AI Substitute Assistant**: A small helper button next to recipe ingredients. If a user is missing an ingredient, they tap it, choose a substitute, and the app displays recalculated temporary macros in real time.

---

## 5. Body Progress & Photo Logger

### Core UI Features
*   **Metrics Trend Dashboard**: Graphical representation of user weight changes, body fat %, and skeletal muscle mass over time.
*   **Body Circumference Input Log**: Multi-input form allowing tracking of individual body part measurements:
    *   Waist, Chest, Shoulders, Left/Right Bicep, Left/Right Thigh, Neck.
*   **Visual Transformation Gallery**: Before/After grid showing side-by-side progression photos (Front, Side, Back profiles) filtered by date, featuring overlay guidelines to help users snap pictures in the exact same stance.
*   **Local Image Caching**: Secure local file buffering before syncing to backend storage.

### API Endpoints Reference
*   `POST /api/v1/progress/metrics` - Submit or update daily body weight, muscle, and body part measurements.
*   `GET /api/v1/progress/metrics` - Fetch the chronological list of all metrics logs.
*   `DELETE /api/v1/progress/metrics/:id` - Delete a specific metrics log.
*   `POST /api/v1/progress/photos/upload` - Upload a progress photo (`multipart/form-data` with keys `file` (image binary), `angle` ('front'|'side'|'back'), and optional `date`).
*   `GET /api/v1/progress/photos` - Retrieve all uploaded progress photos sorted by date.
*   `DELETE /api/v1/progress/photos/:id` - Delete a specific progress photo.
*   `GET /api/v1/progress/analytics` - Fetch weight trends (moving averages), body compositions (lean vs fat mass changes), and circumference totals.
