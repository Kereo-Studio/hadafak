// PerformanceTrackingController has been removed.
// Its HTTP endpoints (POST /workouts/log, GET /workouts/history/:userId) were dead —
// the app never called them and they caused route collisions with WorkoutsController.
//
// The adaptation logic that was triggered from PerformanceTrackingService is now
// wired directly into WorkoutsService.logSession() via AdaptationEngineService.
// The PerformanceLog entity is kept in the DB for schema continuity.
