// Google Analytics 4 Event Tracking Utility
// Measurement ID: G-Z3RR80WGKJ

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Data Layer push for GTM / Looker Studio
export const pushDataLayer = (data: Record<string, any>) => {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }
};

// Core gtag event sender
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
  // Also push to dataLayer for GTM/Looker Studio
  pushDataLayer({ event: eventName, ...params });
};

// ==========================================
// PAGE & NAVIGATION EVENTS
// ==========================================

export const trackPageView = (pagePath: string, pageTitle?: string) => {
  trackEvent("page_view", {
    page_path: pagePath,
    page_title: pageTitle || document.title,
    page_location: window.location.href,
  });
};

export const trackVirtualPageView = (pagePath: string, pageTitle: string) => {
  trackEvent("virtual_page_view", { page_path: pagePath, page_title: pageTitle });
};

// ==========================================
// SCROLL TRACKING
// ==========================================

export const trackScrollDepth = (depth: number, pagePath: string) => {
  trackEvent("scroll_depth", {
    scroll_depth_percent: depth,
    page_path: pagePath,
  });
};

export const trackSectionView = (sectionName: string) => {
  trackEvent("section_view", { section_name: sectionName });
};

// ==========================================
// CLICK & ENGAGEMENT EVENTS
// ==========================================

export const trackButtonClick = (buttonName: string, location: string, extra?: Record<string, any>) => {
  trackEvent("button_click", { button_name: buttonName, click_location: location, ...extra });
};

export const trackLinkClick = (linkText: string, linkUrl: string, linkType: "internal" | "external" | "social") => {
  trackEvent("link_click", { link_text: linkText, link_url: linkUrl, link_type: linkType });
};

export const trackNavClick = (navItem: string) => {
  trackEvent("nav_click", { nav_item: navItem });
};

export const trackDropdownOpen = (dropdownName: string) => {
  trackEvent("dropdown_open", { dropdown_name: dropdownName });
};

export const trackCtaClick = (ctaText: string, ctaLocation: string, ctaDestination?: string) => {
  trackEvent("cta_click", { cta_text: ctaText, cta_location: ctaLocation, cta_destination: ctaDestination });
};

export const trackSocialClick = (platform: string, url: string) => {
  trackEvent("social_click", { social_platform: platform, social_url: url });
};

// ==========================================
// SEARCH & FILTER EVENTS
// ==========================================

export const trackSearch = (searchTerm: string, resultsCount: number, searchLocation: string) => {
  trackEvent("search", { search_term: searchTerm, results_count: resultsCount, search_location: searchLocation });
};

export const trackSearchResultClick = (searchTerm: string, resultTitle: string, resultPosition: number) => {
  trackEvent("search_result_click", { search_term: searchTerm, result_title: resultTitle, result_position: resultPosition });
};

export const trackFilter = (filterType: string, filterValue: string, pagePath: string) => {
  trackEvent("filter_apply", { filter_type: filterType, filter_value: filterValue, page_path: pagePath });
};

export const trackSort = (sortBy: string, pagePath: string) => {
  trackEvent("sort_apply", { sort_by: sortBy, page_path: pagePath });
};

// ==========================================
// USER AUTH EVENTS
// ==========================================

export const trackSignup = (method: string, role: string) => {
  trackEvent("sign_up", { method, role });
};

export const trackLogin = (method: string, role?: string) => {
  trackEvent("login", { method, role });
};

export const trackLogout = () => {
  trackEvent("logout");
};

export const trackRoleSelect = (role: string) => {
  trackEvent("role_select", { selected_role: role });
};

export const trackPasswordReset = (step: "request" | "complete") => {
  trackEvent("password_reset", { step });
};

// ==========================================
// COURSE EVENTS
// ==========================================

export const trackCourseView = (courseId: string, courseTitle: string, coachName: string, category: string, price?: number) => {
  trackEvent("view_item", {
    item_id: courseId,
    item_name: courseTitle,
    item_category: category,
    item_brand: coachName,
    price,
    currency: "USD",
    content_type: "course",
  });
};

export const trackCourseListView = (courses: { id: string; title: string; category: string }[]) => {
  trackEvent("view_item_list", {
    item_list_name: "Courses",
    items: courses.slice(0, 10).map((c, i) => ({
      item_id: c.id, item_name: c.title, item_category: c.category, index: i,
    })),
  });
};

export const trackCourseCardClick = (courseId: string, courseTitle: string, position: number) => {
  trackEvent("select_item", {
    item_id: courseId, item_name: courseTitle, index: position, content_type: "course",
  });
};

export const trackCourseShare = (courseId: string, courseTitle: string, shareMethod: string) => {
  trackEvent("share", { item_id: courseId, item_name: courseTitle, method: shareMethod, content_type: "course" });
};

export const trackVideoPlay = (videoTitle: string, videoType: "intro" | "course" | "webinar") => {
  trackEvent("video_play", { video_title: videoTitle, video_type: videoType });
};

// ==========================================
// ENROLLMENT & CHECKOUT EVENTS
// ==========================================

export const trackBeginEnrollment = (courseId: string, courseTitle: string, price: number, currency: string) => {
  trackEvent("begin_checkout", {
    item_id: courseId, item_name: courseTitle, value: price, currency, content_type: "enrollment",
  });
};

export const trackEnrollmentFormStep = (step: number, stepName: string) => {
  trackEvent("enrollment_form_step", { step_number: step, step_name: stepName });
};

export const trackEnrollmentComplete = (courseId: string, courseTitle: string, amount: number, currency: string, paymentMethod: string) => {
  trackEvent("purchase", {
    transaction_id: `enroll_${Date.now()}`,
    value: amount,
    currency,
    item_id: courseId,
    item_name: courseTitle,
    payment_method: paymentMethod,
  });
};

export const trackEnrollmentFormAbandonment = (courseId: string, lastStep: string) => {
  trackEvent("enrollment_abandonment", { item_id: courseId, last_step: lastStep });
};

// ==========================================
// WEBINAR EVENTS
// ==========================================

export const trackWebinarView = (webinarId: string, webinarTitle: string) => {
  trackEvent("webinar_view", { webinar_id: webinarId, webinar_title: webinarTitle });
};

export const trackWebinarRegister = (webinarId: string, webinarTitle: string) => {
  trackEvent("webinar_register", { webinar_id: webinarId, webinar_title: webinarTitle });
};

export const trackWebinarListView = () => {
  trackEvent("webinar_list_view");
};

// ==========================================
// BLOG EVENTS
// ==========================================

export const trackBlogView = (blogSlug: string, blogTitle: string, category: string) => {
  trackEvent("blog_view", { blog_slug: blogSlug, blog_title: blogTitle, blog_category: category });
};

export const trackBlogListView = (category?: string) => {
  trackEvent("blog_list_view", { blog_category: category || "all" });
};

export const trackBlogShare = (blogSlug: string, shareMethod: string) => {
  trackEvent("blog_share", { blog_slug: blogSlug, method: shareMethod });
};

export const trackBlogReadComplete = (blogSlug: string, readTimeSeconds: number) => {
  trackEvent("blog_read_complete", { blog_slug: blogSlug, read_time_seconds: readTimeSeconds });
};

// ==========================================
// WISHLIST EVENTS
// ==========================================

export const trackWishlistAdd = (courseId: string, courseTitle: string) => {
  trackEvent("add_to_wishlist", { item_id: courseId, item_name: courseTitle });
};

export const trackWishlistRemove = (courseId: string, courseTitle: string) => {
  trackEvent("remove_from_wishlist", { item_id: courseId, item_name: courseTitle });
};

// ==========================================
// REVIEW EVENTS
// ==========================================

export const trackReviewSubmit = (courseId: string, rating: number) => {
  trackEvent("review_submit", { item_id: courseId, rating });
};

// ==========================================
// CHATBOT EVENTS
// ==========================================

export const trackChatbotOpen = () => {
  trackEvent("chatbot_open");
};

export const trackChatbotClose = () => {
  trackEvent("chatbot_close");
};

export const trackChatbotMessage = (role: "user" | "bot", messageLength: number) => {
  trackEvent("chatbot_message", { message_role: role, message_length: messageLength });
};

export const trackChatbotLeadSubmit = (userType: string) => {
  trackEvent("chatbot_lead_submit", { user_type: userType });
};

// ==========================================
// DAILY ZIP (GAME) EVENTS
// ==========================================

export const trackGameStart = (level: number) => {
  trackEvent("game_start", { game_name: "daily_zip", level });
};

export const trackGameComplete = (level: number, score: number, timeSeconds: number) => {
  trackEvent("game_complete", { game_name: "daily_zip", level, score, time_seconds: timeSeconds });
};

export const trackGameLevelUp = (newLevel: number) => {
  trackEvent("level_up", { game_name: "daily_zip", new_level: newLevel });
};

// ==========================================
// REFERRAL EVENTS
// ==========================================

export const trackReferralCreate = (referrerRole: string) => {
  trackEvent("referral_create", { referrer_role: referrerRole });
};

export const trackReferralShare = (shareMethod: string) => {
  trackEvent("referral_share", { method: shareMethod });
};

// ==========================================
// DASHBOARD EVENTS
// ==========================================

export const trackDashboardView = (role: string, section: string) => {
  trackEvent("dashboard_view", { user_role: role, dashboard_section: section });
};

export const trackProfileUpdate = (role: string) => {
  trackEvent("profile_update", { user_role: role });
};

export const trackCsvExport = (exportType: string, recordCount: number) => {
  trackEvent("csv_export", { export_type: exportType, record_count: recordCount });
};

// ==========================================
// CAMPAIGN EVENTS
// ==========================================

export const trackCampaignCreate = (platform: string, role: string) => {
  trackEvent("campaign_create", { campaign_platform: platform, user_role: role });
};

export const trackCampaignSend = (platform: string, recipientCount: number) => {
  trackEvent("campaign_send", { campaign_platform: platform, recipient_count: recipientCount });
};

// ==========================================
// PWA / INSTALL EVENTS
// ==========================================

export const trackInstallPrompt = (platform: string) => {
  trackEvent("install_prompt", { platform });
};

export const trackInstallAccept = (platform: string) => {
  trackEvent("install_accept", { platform });
};

export const trackInstallDismiss = (platform: string) => {
  trackEvent("install_dismiss", { platform });
};

// ==========================================
// FORM EVENTS
// ==========================================

export const trackFormStart = (formName: string) => {
  trackEvent("form_start", { form_name: formName });
};

export const trackFormSubmit = (formName: string) => {
  trackEvent("form_submit", { form_name: formName });
};

export const trackFormError = (formName: string, errorField: string) => {
  trackEvent("form_error", { form_name: formName, error_field: errorField });
};

// ==========================================
// MEDIA EVENTS
// ==========================================

export const trackImageView = (imageName: string, location: string) => {
  trackEvent("image_view", { image_name: imageName, view_location: location });
};

export const trackFileDownload = (fileName: string, fileType: string) => {
  trackEvent("file_download", { file_name: fileName, file_type: fileType });
};

// ==========================================
// LOCATION & CURRENCY EVENTS
// ==========================================

export const trackLocationChange = (country: string) => {
  trackEvent("location_change", { selected_country: country });
};

export const trackCurrencyChange = (currency: string) => {
  trackEvent("currency_change", { selected_currency: currency });
};

// ==========================================
// ERROR TRACKING
// ==========================================

export const trackError = (errorType: string, errorMessage: string, pagePath: string) => {
  trackEvent("error", { error_type: errorType, error_message: errorMessage, page_path: pagePath });
};

export const track404 = (attemptedUrl: string) => {
  trackEvent("page_not_found", { attempted_url: attemptedUrl });
};

// ==========================================
// TIMING & PERFORMANCE
// ==========================================

export const trackTimeOnPage = (pagePath: string, timeSeconds: number) => {
  trackEvent("time_on_page", { page_path: pagePath, time_seconds: timeSeconds });
};

export const trackEngagement = (engagementType: string, details?: Record<string, any>) => {
  trackEvent("user_engagement", { engagement_type: engagementType, ...details });
};

// ==========================================
// UNSUBSCRIBE
// ==========================================

export const trackUnsubscribe = (email: string) => {
  trackEvent("unsubscribe", { method: "email_link" });
};
