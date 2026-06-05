import { Routes, Route, Navigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { BarChart3, Users, GraduationCap, DollarSign, Settings, Star, Shield, BookOpen, Video, ClipboardList, TrendingUp, Globe, Bot, MessageSquare, Gamepad2, Mail, Share2, Megaphone, UserCheck, MousePointerClick, FolderOpen, Plug, FileCheck, Search, KeyRound, LayoutGrid, MessageCircle, ImageIcon, ScrollText, ShieldCheck, Image, Bell, CreditCard, Package, Inbox, HelpCircle, Link as LinkIcon, Coins } from "lucide-react";

import AdminMarqueeManager from "@/components/admin/AdminMarqueeManager";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminCoaches from "@/components/admin/AdminCoaches";
import AdminLearners from "@/components/admin/AdminLearners";
import AdminSignupSubmissions from "@/components/admin/AdminSignupSubmissions";
import AdminCourses from "@/components/admin/AdminCourses";
import AdminRevenue from "@/components/admin/AdminRevenue";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminWebinars from "@/components/admin/AdminWebinars";
import AdminEnrollments from "@/components/admin/AdminEnrollments";
import AdminCoachPerformance from "@/components/admin/AdminCoachPerformance";
import AdminLocaleSettings from "@/components/admin/AdminLocaleSettings";
import AdminChatbotLeads from "@/components/admin/AdminChatbotLeads";
import AdminCommunicationSettings from "@/components/admin/AdminCommunicationSettings";
import AdminDailyZip from "@/components/admin/AdminDailyZip";
import AdminBlogs from "@/components/admin/AdminBlogs";
import AdminEmailTools from "@/components/admin/AdminEmailTools";
import AdminSocialMedia from "@/components/admin/AdminSocialMedia";
import AdminCampaigns from "@/components/admin/AdminCampaigns";
import AdminWebinarRegistrations from "@/components/admin/AdminWebinarRegistrations";
import AdminTrafficAnalytics from "@/components/admin/AdminTrafficAnalytics";
import AdminMaterials from "@/components/admin/AdminMaterials";
import AdminIntegrationsHub from "@/components/admin/AdminIntegrationsHub";
import AdminCoachCampaigns from "@/components/admin/AdminCoachCampaigns";
import AdminSharingRequests from "@/components/admin/AdminSharingRequests";
import AdminSEODashboard from "@/components/admin/AdminSEODashboard";
import AdminContactRequests from "@/components/admin/AdminContactRequests";
import AdminReferrals from "@/components/admin/AdminReferrals";
import AdminWebinarAnalytics from "@/components/admin/AdminWebinarAnalytics";
import AdminCoachCategories from "@/components/admin/AdminCoachCategories";
import AdminCategoryRequests from "@/components/admin/AdminCategoryRequests";
import AdminCoachWebsites from "@/components/admin/AdminCoachWebsites";
import AdminCoachLPLeads from "@/components/admin/AdminCoachLPLeads";
import AdminWhatsAppAccess from "@/components/admin/AdminWhatsAppAccess";
import AdminThumbnailAccess from "@/components/admin/AdminThumbnailAccess";
import AdminWorkshopAccess from "@/components/admin/AdminWorkshopAccess";
import AdminWorkshopTracking from "@/components/admin/AdminWorkshopTracking";
import AdminCoachFeatureControl from "@/components/admin/AdminCoachFeatureControl";
import AdminLandingPages from "@/components/admin/AdminLandingPages";
import AdminCourseThumbnails from "@/components/admin/AdminCourseThumbnails";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import AdminPlans from "@/components/admin/AdminPlans";
import AdminBundles from "@/components/admin/AdminBundles";
import AdminCoachSubscriptions from "@/components/admin/AdminCoachSubscriptions";
import AdminFeatureRequests from "@/components/admin/AdminFeatureRequests";
import AdminKnowledgeHub from "@/components/admin/AdminKnowledgeHub";
import AdminFeatureControlSystem from "@/components/admin/AdminFeatureControlSystem";
import AdminDigitalProductsControl from "@/components/admin/AdminDigitalProductsControl";
import AdminExternalLinkControl from "@/components/admin/AdminExternalLinkControl";
import AdminCurriculumControl from "@/components/admin/AdminCurriculumControl";
import AdminCurrencyManagement from "@/components/admin/AdminCurrencyManagement";
import AdminAssignments from "@/components/admin/AdminAssignments";
import AdminLMSOverview from "@/components/admin/AdminLMSOverview";
import AdminCourseCategories from "@/components/admin/AdminCourseCategories";
import AdminAIKidsEnrollments from "@/components/admin/AdminAIKidsEnrollments";


const navItems = [
  { label: "Analytics", path: "/admin", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Traffic Analytics", path: "/admin/traffic", icon: <MousePointerClick className="h-4 w-4" /> },
  { label: "Course Categories", path: "/admin/course-categories", icon: <LayoutGrid className="h-4 w-4" /> },
  { label: "Coaches", path: "/admin/coaches", icon: <Shield className="h-4 w-4" /> },
  { label: "Coach Categories", path: "/admin/coach-categories", icon: <LayoutGrid className="h-4 w-4" /> },
  { label: "Category Requests", path: "/admin/category-requests", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Learners", path: "/admin/learners", icon: <GraduationCap className="h-4 w-4" /> },
  { label: "Signup Submissions", path: "/admin/signup-submissions", icon: <GraduationCap className="h-4 w-4" /> },
  { label: "Courses", path: "/admin/courses", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Blog Management", path: "/admin/blogs", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Materials", path: "/admin/materials", icon: <FolderOpen className="h-4 w-4" /> },
  { label: "Webinars", path: "/admin/webinars", icon: <Video className="h-4 w-4" /> },
  { label: "Webinar Registrations", path: "/admin/webinar-registrations", icon: <UserCheck className="h-4 w-4" /> },
  { label: "Webinar Analytics", path: "/admin/webinar-analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Enrollments", path: "/admin/enrollments", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Coach Performance", path: "/admin/performance", icon: <TrendingUp className="h-4 w-4" /> },
  { label: "Revenue", path: "/admin/revenue", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Reviews", path: "/admin/reviews", icon: <Star className="h-4 w-4" /> },
  { label: "Chatbot Leads", path: "/admin/chatbot-leads", icon: <Bot className="h-4 w-4" /> },
  { label: "Communication", path: "/admin/communication", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "Contact Requests", path: "/admin/contact-requests", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Daily Zip", path: "/admin/daily-zip", icon: <Gamepad2 className="h-4 w-4" /> },
  { label: "Email Marketing", path: "/admin/email-tools", icon: <Mail className="h-4 w-4" /> },
  { label: "Social Media", path: "/admin/social", icon: <Share2 className="h-4 w-4" /> },
  { label: "Campaigns", path: "/admin/campaigns", icon: <Megaphone className="h-4 w-4" /> },
  { label: "Coach Campaigns", path: "/admin/coach-campaigns", icon: <TrendingUp className="h-4 w-4" /> },
  { label: "Referral Tracking", path: "/admin/referrals", icon: <Users className="h-4 w-4" /> },
  { label: "Integrations", path: "/admin/integrations", icon: <Plug className="h-4 w-4" /> },
  { label: "Sharing Requests", path: "/admin/sharing", icon: <FileCheck className="h-4 w-4" /> },
  { label: "Coach Websites", path: "/admin/coach-websites", icon: <Globe className="h-4 w-4" /> },
  { label: "Coach Leads from LP", path: "/admin/coach-lp-leads", icon: <Users className="h-4 w-4" /> },
  { label: "SEO Dashboard", path: "/admin/seo", icon: <Search className="h-4 w-4" /> },
  { label: "Knowledge Hub (AEO)", path: "/admin/knowledge", icon: <HelpCircle className="h-4 w-4" /> },
  { label: "WhatsApp Access", path: "/admin/whatsapp-access", icon: <MessageCircle className="h-4 w-4" /> },
  { label: "Thumbnail Access", path: "/admin/thumbnail-access", icon: <ImageIcon className="h-4 w-4" /> },
  { label: "Workshop Access", path: "/admin/workshop-access", icon: <Video className="h-4 w-4" /> },
  { label: "Workshop Tracking", path: "/admin/workshop-tracking", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Feature Control", path: "/admin/feature-control", icon: <ShieldCheck className="h-4 w-4" /> },
  { label: "Coach Feature Approval", path: "/admin/coach-feature-approval", icon: <Settings className="h-4 w-4" /> },
  { label: "Digital Products", path: "/admin/digital-products", icon: <Package className="h-4 w-4" /> },
  { label: "Plans", path: "/admin/plans", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Feature Bundles", path: "/admin/bundles", icon: <Package className="h-4 w-4" /> },
  { label: "Coach Subscriptions", path: "/admin/subscriptions", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Feature Requests", path: "/admin/feature-requests", icon: <Inbox className="h-4 w-4" /> },
  { label: "Landing Pages", path: "/admin/landing-pages", icon: <Globe className="h-4 w-4" /> },
  { label: "Course Thumbnails", path: "/admin/course-thumbnails", icon: <Image className="h-4 w-4" /> },
  { label: "Notifications", path: "/admin/notifications", icon: <Bell className="h-4 w-4" /> },
  { label: "Marquee Manager", path: "/admin/marquee", icon: <ScrollText className="h-4 w-4" /> },
  { label: "Settings", path: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
  { label: "Locale & Currency", path: "/admin/locale", icon: <Globe className="h-4 w-4" /> },
  { label: "External Link Control", path: "/admin/external-links", icon: <LinkIcon className="h-4 w-4" /> },
  { label: "Curriculum Control", path: "/admin/curriculum-control", icon: <ShieldCheck className="h-4 w-4" /> },
  { label: "Currency Management", path: "/admin/currencies", icon: <Coins className="h-4 w-4" /> },
  { label: "Assignments", path: "/admin/assignments", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "LMS Oversight", path: "/admin/lms-overview", icon: <TrendingUp className="h-4 w-4" /> },
];


const AdminDashboard = () => {
  useSEO({
    title: "Admin Dashboard – AI Coach Portal",
    description: "Platform administration dashboard for managing courses, coaches, learners, and analytics.",
    canonical: "https://www.aicoachportal.com/admin",
    noIndex: true,
  });

  return (
    <DashboardLayout navItems={navItems} title="Admin Dashboard">
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="course-categories" element={<AdminCourseCategories />} />
        <Route path="traffic" element={<AdminTrafficAnalytics />} />
        <Route path="coaches" element={<AdminCoaches />} />
        <Route path="coach-categories" element={<AdminCoachCategories />} />
        <Route path="category-requests" element={<AdminCategoryRequests />} />
        <Route path="learners" element={<AdminLearners />} />
        <Route path="signup-submissions" element={<AdminSignupSubmissions />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="blogs" element={<AdminBlogs />} />
        <Route path="materials" element={<AdminMaterials />} />
        <Route path="webinars" element={<AdminWebinars />} />
        <Route path="webinar-registrations" element={<AdminWebinarRegistrations />} />
        <Route path="webinar-analytics" element={<AdminWebinarAnalytics />} />
        <Route path="enrollments" element={<AdminEnrollments />} />
        <Route path="performance" element={<AdminCoachPerformance />} />
        <Route path="revenue" element={<AdminRevenue />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="chatbot-leads" element={<AdminChatbotLeads />} />
        <Route path="communication" element={<AdminCommunicationSettings />} />
        <Route path="contact-requests" element={<AdminContactRequests />} />
        <Route path="daily-zip" element={<AdminDailyZip />} />
        <Route path="email-tools" element={<AdminEmailTools />} />
        <Route path="social" element={<AdminSocialMedia />} />
        <Route path="campaigns" element={<AdminCampaigns />} />
        <Route path="coach-campaigns" element={<AdminCoachCampaigns />} />
        <Route path="integrations" element={<AdminIntegrationsHub />} />
        <Route path="sharing" element={<AdminSharingRequests />} />
        <Route path="coach-websites" element={<AdminCoachWebsites />} />
        <Route path="coach-lp-leads" element={<AdminCoachLPLeads />} />
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="seo" element={<AdminSEODashboard />} />
        <Route path="knowledge" element={<AdminKnowledgeHub />} />
        <Route path="whatsapp-access" element={<AdminWhatsAppAccess />} />
        <Route path="thumbnail-access" element={<AdminThumbnailAccess />} />
        <Route path="workshop-access" element={<AdminWorkshopAccess />} />
        <Route path="workshop-tracking" element={<AdminWorkshopTracking />} />
        <Route path="feature-control" element={<AdminFeatureControlSystem />} />
        <Route path="feature-control-system" element={<AdminFeatureControlSystem />} />
        <Route path="coach-feature-approval" element={<AdminCoachFeatureControl />} />
        <Route path="digital-products" element={<AdminDigitalProductsControl />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="bundles" element={<AdminBundles />} />
        <Route path="subscriptions" element={<AdminCoachSubscriptions />} />
        <Route path="feature-requests" element={<AdminFeatureRequests />} />
        <Route path="landing-pages" element={<AdminLandingPages />} />
        <Route path="course-thumbnails" element={<AdminCourseThumbnails />} />
        <Route path="notifications" element={<AdminNotificationCenter />} />
        <Route path="marquee" element={<AdminMarqueeManager />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="locale" element={<AdminLocaleSettings />} />
        <Route path="external-links" element={<AdminExternalLinkControl />} />
        <Route path="curriculum-control" element={<AdminCurriculumControl />} />
        <Route path="currencies" element={<AdminCurrencyManagement />} />
        <Route path="assignments" element={<AdminAssignments />} />
        <Route path="lms-overview" element={<AdminLMSOverview />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />

      </Routes>
    </DashboardLayout>
  );
};

export default AdminDashboard;
