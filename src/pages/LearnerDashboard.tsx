import { Routes, Route, Navigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { BookOpen, User, Heart, History, Award, Settings, Video, Zap, Share2, FileText, MessageSquare, Sparkles, Bell, Star, Link as LinkIcon, Briefcase, Calendar } from "lucide-react";
import { useExternalLinkControl } from "@/hooks/useExternalLinkControl";
import LearnerProfile from "@/components/learner/LearnerProfile";
import LearnerCourses from "@/components/learner/LearnerCourses";
import LearnerWishlist from "@/components/learner/LearnerWishlist";
import LearnerPayments from "@/components/learner/LearnerPayments";
import LearnerCertificates from "@/components/learner/LearnerCertificates";
import LearnerReferrals from "@/components/learner/LearnerReferrals";
import LearnerWebinars from "@/components/learner/LearnerWebinars";
import LearnerDailyZip from "@/components/learner/LearnerDailyZip";
import DailyZip from "@/pages/DailyZip";
import SocialMediaHub from "@/components/shared/SocialMediaHub";
import DashboardMaterials from "@/components/shared/DashboardMaterials";
import LearnerChatHistory from "@/components/learner/LearnerChatHistory";
import PromptGeneratorForm from "@/components/prompt/PromptGeneratorForm";
import LearnerWorkshops from "@/components/learner/LearnerWorkshops";
import LearnerNotifications from "@/components/learner/LearnerNotifications";
import LearnerReviews from "@/components/learner/LearnerReviews";
import LearnerCoachMaterials from "@/components/learner/LearnerCoachMaterials";
import LearnerSessions from "@/components/learner/LearnerSessions";

const LearnerDashboard = () => {
  const { enabled: aiJobsLinkedInEnabled } = useExternalLinkControl("ai_jobs_news_linkedin_post");

  useSEO({
    title: "Learner Dashboard – My Courses & Progress",
    description: "Access your enrolled courses, webinars, certificates, and learning progress.",
    canonical: "https://www.aicoachportal.com/learner",
    noIndex: true,
  });

  const navItems = [
    { label: "My Courses", path: "/learner/courses", icon: <BookOpen className="h-4 w-4" /> },
    { label: "Notifications", path: "/learner/notifications", icon: <Bell className="h-4 w-4" /> },
    { label: "My Reviews", path: "/learner/reviews", icon: <Star className="h-4 w-4" /> },
    { label: "Webinars", path: "/learner/webinars", icon: <Video className="h-4 w-4" /> },
    { label: "Workshops", path: "/learner/workshops", icon: <Video className="h-4 w-4" /> },
    { label: "My Sessions", path: "/learner/sessions", icon: <Calendar className="h-4 w-4" /> },
    { label: "Certificates", path: "/learner/certificates", icon: <Award className="h-4 w-4" /> },
    { label: "Materials", path: "/learner/materials", icon: <FileText className="h-4 w-4" /> },
    { label: "My Coach Materials", path: "/learner/coach-materials", icon: <LinkIcon className="h-4 w-4" /> },
    { label: "Chat History", path: "/learner/chat-history", icon: <MessageSquare className="h-4 w-4" /> },
    { label: "Daily Zip", path: "/learner/daily-zip", icon: <Zap className="h-4 w-4" /> },
    { label: "Prompt Generator", path: "/learner/prompt-generator", icon: <Sparkles className="h-4 w-4" /> },
    { label: "Social Media", path: "/learner/social", icon: <Share2 className="h-4 w-4" /> },
    ...(aiJobsLinkedInEnabled
      ? [{ label: "AI Jobs & News – LinkedIn Post", path: "/ai-jobs-news/linkedin-post", icon: <Briefcase className="h-4 w-4" /> }]
      : []),
    { label: "Profile", path: "/learner/profile", icon: <User className="h-4 w-4" /> },
    { label: "Wishlist", path: "/learner/wishlist", icon: <Heart className="h-4 w-4" /> },
    { label: "Payment History", path: "/learner/payments", icon: <History className="h-4 w-4" /> },
    { label: "Referrals", path: "/learner/referrals", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout navItems={navItems} title="Learner Dashboard" marqueeSegment="learner">
      <Routes>
        <Route path="courses" element={<LearnerCourses />} />
        <Route path="notifications" element={<LearnerNotifications />} />
        <Route path="reviews" element={<LearnerReviews />} />
        <Route path="webinars" element={<LearnerWebinars />} />
        <Route path="workshops" element={<LearnerWorkshops />} />
        <Route path="sessions" element={<LearnerSessions />} />
        <Route path="certificates" element={<LearnerCertificates />} />
        <Route path="materials" element={<DashboardMaterials />} />
        <Route path="coach-materials" element={<LearnerCoachMaterials />} />
        <Route path="chat-history" element={<LearnerChatHistory />} />
        <Route path="daily-zip" element={<DailyZip />} />
        <Route path="prompt-generator" element={<div className="space-y-4"><h2 className="text-xl font-bold text-foreground">Prompt Generator</h2><div className="rounded-xl border border-border bg-card p-6"><PromptGeneratorForm showSave userRole="learner" /></div></div>} />
        <Route path="social" element={<SocialMediaHub />} />
        <Route path="profile" element={<LearnerProfile />} />
        <Route path="wishlist" element={<LearnerWishlist />} />
        <Route path="payments" element={<LearnerPayments />} />
        <Route path="referrals" element={<LearnerReferrals />} />
        <Route path="*" element={<Navigate to="courses" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default LearnerDashboard;
