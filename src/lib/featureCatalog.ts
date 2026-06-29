// Single source of truth for all coach-facing features that can be
// gated via Admin → Feature Bundles. Add new features here and they
// automatically appear in the bundle editor and the resolver hook.

export interface FeatureDef {
  key: string;
  label: string;
  description?: string;
}

export interface FeatureCategory {
  key: string;
  label: string;
  icon: string; // emoji for quick visual grouping
  features: FeatureDef[];
}

export const FEATURE_CATALOG: FeatureCategory[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "📊",
    features: [
      { key: "dashboard_access", label: "Dashboard Access" },
      { key: "analytics_dashboard", label: "Analytics Dashboard" },
      { key: "revenue_dashboard", label: "Revenue Dashboard" },
      { key: "notifications", label: "Notifications" },
      { key: "activity_timeline", label: "Activity Timeline" },
    ],
  },
  {
    key: "profile",
    label: "Profile",
    icon: "👤",
    features: [
      { key: "coach_profile", label: "Coach Profile" },
      { key: "public_profile", label: "Public Profile" },
      { key: "profile_picture_access", label: "Profile Picture" },
      { key: "about_section", label: "About Section" },
      { key: "contact_information", label: "Contact Information" },
      { key: "social_links", label: "Social Links" },
      { key: "seo_settings", label: "SEO Settings" },
      { key: "verification_badge", label: "Verification Badge" },
    ],
  },
  {
    key: "courses",
    label: "Courses & LMS",
    icon: "🎓",
    features: [
      { key: "courses_access", label: "Create Courses" },
      { key: "unlimited_courses", label: "Unlimited Courses" },
      { key: "course_categories", label: "Course Categories" },
      { key: "course_modules", label: "Modules" },
      { key: "course_lessons", label: "Lessons" },
      { key: "video_upload", label: "Video Upload" },
      { key: "youtube_videos", label: "YouTube Videos" },
      { key: "pdf_upload", label: "PDF Upload" },
      { key: "audio_upload", label: "Audio Upload" },
      { key: "downloadable_resources", label: "Downloadable Resources" },
      { key: "assignments_access", label: "Assignments" },
      { key: "quizzes", label: "Quizzes" },
      { key: "certificates", label: "Certificates" },
      { key: "drip_content", label: "Drip Content" },
      { key: "course_completion_tracking", label: "Course Completion Tracking" },
      { key: "private_courses", label: "Private Courses" },
      { key: "free_courses", label: "Free Courses" },
      { key: "paid_courses", label: "Paid Courses" },
      { key: "kids_courses_access", label: "AI Kids Pro Courses" },
    ],
  },
  {
    key: "workshops",
    label: "Workshops",
    icon: "🛠️",
    features: [
      { key: "workshops_access", label: "Create Workshops" },
      { key: "live_workshops", label: "Live Workshops" },
      { key: "recurring_workshops", label: "Recurring Workshops" },
      { key: "workshop_certificates", label: "Workshop Certificates" },
      { key: "workshop_registration", label: "Workshop Registration" },
      { key: "attendance_tracking", label: "Attendance Tracking" },
    ],
  },
  {
    key: "webinars",
    label: "Webinars",
    icon: "🎥",
    features: [
      { key: "create_webinar", label: "Create Webinar" },
      { key: "webinar_registration", label: "Webinar Registration" },
      { key: "webinar_analytics", label: "Webinar Analytics" },
      { key: "webinar_certificates", label: "Webinar Certificates" },
      { key: "webinar_auto_reminder", label: "Auto Reminder" },
      { key: "webinar_recording_upload", label: "Recording Upload" },
    ],
  },
  {
    key: "services",
    label: "Services",
    icon: "🤝",
    features: [
      { key: "one_on_one_coaching", label: "1:1 Coaching" },
      { key: "group_coaching", label: "Group Coaching" },
      { key: "consultation_booking", label: "Consultation Booking" },
      { key: "calendar_availability", label: "Calendar Availability" },
      { key: "appointment_scheduling", label: "Appointment Scheduling" },
    ],
  },
  {
    key: "community",
    label: "Community",
    icon: "💬",
    features: [
      { key: "feed_access", label: "Feed" },
      { key: "community_posts", label: "Posts" },
      { key: "community_comments", label: "Comments" },
      { key: "community_likes", label: "Likes" },
      { key: "community_groups", label: "Groups" },
      { key: "community_announcements", label: "Announcements" },
    ],
  },
  {
    key: "messaging",
    label: "Messaging",
    icon: "✉️",
    features: [
      { key: "messaging_access", label: "Inbox" },
      { key: "direct_messages", label: "Direct Messages" },
      { key: "broadcast_messages", label: "Broadcast Messages" },
      { key: "email_messaging", label: "Email Messaging" },
      { key: "whatsapp_messaging", label: "WhatsApp Messaging" },
    ],
  },
  {
    key: "blueprint",
    label: "Blueprint",
    icon: "🧭",
    features: [
      { key: "blueprint_access", label: "Create Blueprint" },
      { key: "ai_blueprint_generator", label: "AI Blueprint Generator" },
      { key: "blueprint_templates", label: "Blueprint Templates" },
    ],
  },
  {
    key: "materials",
    label: "Materials",
    icon: "📚",
    features: [
      { key: "materials_access", label: "Resource Library" },
      { key: "file_upload", label: "File Upload" },
      { key: "download_center", label: "Download Center" },
      { key: "documents", label: "Documents" },
      { key: "templates", label: "Templates" },
    ],
  },
  {
    key: "landing_funnels",
    label: "Landing Pages & Funnels",
    icon: "🚀",
    features: [
      { key: "landing_page_builder", label: "Landing Page Builder" },
      { key: "funnel_builder", label: "Funnel Builder" },
      { key: "website_builder", label: "Website Builder" },
      { key: "custom_domains", label: "Custom Domains" },
      { key: "blog", label: "Blog" },
      { key: "seo_tools", label: "SEO Tools" },
      { key: "popup_builder", label: "Popup Builder" },
      { key: "forms", label: "Forms" },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: "📣",
    features: [
      { key: "email_campaigns", label: "Email Campaigns" },
      { key: "whatsapp_campaigns", label: "WhatsApp Campaigns" },
      { key: "sms_campaigns", label: "SMS Campaigns" },
      { key: "marketing_automation", label: "Marketing Automation" },
      { key: "lead_capture_forms", label: "Lead Capture Forms" },
      { key: "crm_access", label: "CRM" },
      { key: "leads_access", label: "Lead Management" },
      { key: "tags_segments", label: "Tags & Segments" },
      { key: "ai_content_generator", label: "AI Content Generator" },
    ],
  },
  {
    key: "payments",
    label: "Payments",
    icon: "💳",
    features: [
      { key: "razorpay", label: "Razorpay" },
      { key: "stripe", label: "Stripe" },
      { key: "coupons", label: "Coupons" },
      { key: "discount_codes", label: "Discount Codes" },
      { key: "upsells", label: "Upsells" },
      { key: "order_bumps", label: "Order Bumps" },
      { key: "subscription_plans", label: "Subscription Plans" },
      { key: "membership_billing", label: "Membership Billing" },
      { key: "payout_reports", label: "Payout Reports" },
      { key: "invoices", label: "Invoices" },
    ],
  },
  {
    key: "membership",
    label: "Membership",
    icon: "🏆",
    features: [
      { key: "membership_creation", label: "Membership Creation" },
      { key: "membership_levels", label: "Membership Levels" },
      { key: "paid_content_access", label: "Premium Content" },
      { key: "paid_community", label: "Paid Community" },
    ],
  },
  {
    key: "ai_features",
    label: "AI Features",
    icon: "✨",
    features: [
      { key: "ai_chat_assistant", label: "AI Chat Assistant" },
      { key: "ai_course_generator", label: "AI Course Generator" },
      { key: "ai_landing_page_generator", label: "AI Landing Page Generator" },
      { key: "ai_email_generator", label: "AI Email Generator" },
      { key: "ai_thumbnail_generator", label: "AI Thumbnail Generator" },
      { key: "ai_image_generator", label: "AI Image Generator" },
      { key: "ai_certificate_generator", label: "AI Certificate Generator" },
      { key: "ai_automation_builder", label: "AI Automation Builder" },
    ],
  },
  {
    key: "integrations",
    label: "Integrations",
    icon: "🔌",
    features: [
      { key: "zoom_integration", label: "Zoom" },
      { key: "google_meet_integration", label: "Google Meet" },
      { key: "google_calendar_integration", label: "Google Calendar" },
      { key: "outlook_calendar_integration", label: "Outlook Calendar" },
      { key: "whatsapp_integration", label: "WhatsApp" },
      { key: "zapier_integration", label: "Zapier" },
      { key: "webhooks", label: "Webhooks" },
      { key: "api_access", label: "API Access" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: "📈",
    features: [
      { key: "revenue_reports", label: "Revenue Reports" },
      { key: "sales_reports", label: "Sales Reports" },
      { key: "student_reports", label: "Student Reports" },
      { key: "webinar_reports", label: "Webinar Reports" },
      { key: "marketing_reports", label: "Marketing Reports" },
      { key: "export_csv", label: "Export CSV" },
      { key: "export_excel", label: "Export Excel" },
    ],
  },
  {
    key: "storage_limits",
    label: "Storage & Limits",
    icon: "💾",
    features: [
      { key: "cloud_storage_limit", label: "Cloud Storage Limit" },
      { key: "ai_credits", label: "AI Credits" },
      { key: "email_credits", label: "Email Credits" },
      { key: "whatsapp_credits", label: "WhatsApp Credits" },
      { key: "monthly_upload_limit", label: "Monthly Upload Limit" },
      { key: "monthly_webinar_limit", label: "Monthly Webinar Limit" },
      { key: "monthly_course_limit", label: "Monthly Course Limit" },
      { key: "monthly_student_limit", label: "Monthly Student Limit" },
    ],
  },
];

export const ALL_FEATURE_KEYS = FEATURE_CATALOG.flatMap((c) => c.features.map((f) => f.key));

export const findFeature = (key: string) => {
  for (const cat of FEATURE_CATALOG) {
    const f = cat.features.find((x) => x.key === key);
    if (f) return { category: cat, feature: f };
  }
  return null;
};
