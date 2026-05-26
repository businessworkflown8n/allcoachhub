/**
 * Service layer — compatibility middleware over the existing Supabase client.
 *
 * Existing components are NOT required to migrate. New code can import from
 * here for typed, centralized data access with consistent error handling.
 *
 * All functions use `safeQuery` and return `{ data, error }`.
 */
export * as profileService from "./profile.service";
export * as courseService from "./course.service";
export * as enrollmentService from "./enrollment.service";
export * as webinarService from "./webinar.service";
export * as leadService from "./lead.service";
export * as paymentService from "./payment.service";
export * as storageService from "./storage.service";
export * as notificationService from "./notification.service";
export * as activityService from "./activity.service";
export * as authService from "./auth.service";
