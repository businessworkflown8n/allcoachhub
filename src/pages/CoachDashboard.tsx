import { Routes, Route, Navigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { User, BookOpen, BarChart3, DollarSign, Plus, Video, Share2, Megaphone, LayoutDashboard, FileText, TrendingUp, FileBarChart, Sparkles, Globe, MessageCircle, Bell, Gamepad2, UserPlus, Rocket, Users, Calendar, Target, Package, Zap, Bot, Search, Link as LinkIcon } from "lucide-react";
import CoachClients from "@/components/coach/CoachClients";
import CoachLeads from "@/components/coach/CoachLeads";
import CoachSessions from "@/components/coach/CoachSessions";
import CoachProgress from "@/components/coach/CoachProgress";
import CoachPackages from "@/components/coach/CoachPackages";
import CoachAutomations from "@/components/coach/CoachAutomations";
import CoachCopilot from "@/components/coach/CoachCopilot";
import CoachContentStudio from "@/components/coach/CoachContentStudio";
import CoachBlueprintWorkspace from "@/components/coach/blueprint/CoachBlueprintWorkspace";
import CoachProfile from "@/components/coach/CoachProfile";
import CoachCourses from "@/components/coach/CoachCourses";
import CoachCourseForm from "@/components/coach/CoachCourseForm";
import CurriculumBuilder from "@/components/coach/curriculum/CurriculumBuilder";
import CoachEnrollments from "@/components/coach/CoachEnrollments";
import CoachEarnings from "@/components/coach/CoachEarnings";
import CoachWebinars from "@/components/coach/CoachWebinars";
import SocialMediaHub from "@/components/shared/SocialMediaHub";
import CoachCampaigns from "@/components/coach/CoachCampaigns";
import CoachOverview from "@/components/coach/CoachOverview";
import DashboardMaterials from "@/components/shared/DashboardMaterials";
import CoachMaterials from "@/components/coach/CoachMaterials";
import CoachExternalMaterials from "@/components/coach/CoachExternalMaterials";
import CoachCampaignInsights from "@/components/coach/CoachCampaignInsights";
import CoachReportBuilder from "@/components/coach/CoachReportBuilder";
import PromptGeneratorForm from "@/components/prompt/PromptGeneratorForm";
import CoachWebsiteManager from "@/components/coach/CoachWebsiteManager";
import CoachWhatsApp from "@/components/coach/CoachWhatsApp";
import { useEmailMarketingAccess } from "@/hooks/useEmailMarketingAccess";
import { useWhatsAppAccess } from "@/hooks/useWhatsAppAccess";
import { useWorkshopAccess } from "@/hooks/useWorkshopAccess";
import { useCoachFeatures } from "@/hooks/useCoachFeatures";
import CoachWorkshops from "@/components/coach/CoachWorkshops";
import CoachNotificationRequests from "@/components/coach/CoachNotificationRequests";
import CoachReferrals from "@/components/coach/CoachReferrals";
import DailyZip from "@/pages/DailyZip";
import CoachSEOPanel from "@/components/coach/CoachSEOPanel";
import CoachDigitalProducts from "@/components/coach/CoachDigitalProducts";
import { useDigitalProductAccess } from "@/hooks/useDigitalProductAccess";
import CoachLinkedInPost from "@/components/coach/CoachLinkedInPost";
import { useFeatureControl } from "@/hooks/useFeatureControl";

const CoachDashboard = () => {
  useSEO({
    title: "Coach Dashboard – Manage Courses & Earnings",
    description: "Manage your courses, enrollments, webinars, and track your coaching earnings.",
    canonical: "https://www.aicoachportal.com/coach",
    noIndex: true,
  });

  const { hasAccess: hasEmailAccess } = useEmailMarketingAccess();
  const { hasAccess: hasWhatsAppAccess } = useWhatsAppAccess();
  const { hasAccess: hasWorkshopAccess } = useWorkshopAccess();
  const features = useCoachFeatures();
  const { access: dpAccess } = useDigitalProductAccess();
  const { data: linkedinFeature } = useFeatureControl("linkedin_post");
  const linkedinEnabled = !!linkedinFeature?.enabled;

  const navItems = [
    { label: "Overview", path: "/coach/overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    ...((features as any).blueprint_access !== false ? [{ label: "Blueprint", path: "/coach/blueprint", icon: <Rocket className="h-4 w-4" /> }] : []),
    ...(features.courses_access ? [
      { label: "My Courses", path: "/coach/courses", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Add Course", path: "/coach/courses/new", icon: <Plus className="h-4 w-4" /> },
    ] : []),
    ...(features.workshops_access ? [
      { label: "My Webinars", path: "/coach/webinars", icon: <Video className="h-4 w-4" /> },
    ] : []),
    { label: "Enrollments", path: "/coach/enrollments", icon: <BarChart3 className="h-4 w-4" /> },
    ...((features as any).crm_access ? [{ label: "Clients", path: "/coach/clients", icon: <Users className="h-4 w-4" /> }] : []),
    ...((features as any).leads_access ? [{ label: "Lead Pipeline", path: "/coach/leads", icon: <TrendingUp className="h-4 w-4" /> }] : []),
    ...((features as any).sessions_access ? [{ label: "Sessions", path: "/coach/sessions", icon: <Calendar className="h-4 w-4" /> }] : []),
    ...((features as any).progress_access ? [{ label: "Progress", path: "/coach/progress", icon: <Target className="h-4 w-4" /> }] : []),
    ...((features as any).packages_access ? [{ label: "Packages", path: "/coach/packages", icon: <Package className="h-4 w-4" /> }] : []),
    ...((features as any).automations_access ? [{ label: "Automations", path: "/coach/automations", icon: <Zap className="h-4 w-4" /> }] : []),
    ...((features as any).copilot_access ? [{ label: "AI Copilot", path: "/coach/copilot", icon: <Bot className="h-4 w-4" /> }] : []),
    ...((features as any).content_studio_access ? [{ label: "Content Studio", path: "/coach/content-studio", icon: <FileText className="h-4 w-4" /> }] : []),
    { label: "Campaign Insights", path: "/coach/insights", icon: <TrendingUp className="h-4 w-4" /> },
    { label: "Report Builder", path: "/coach/reports", icon: <FileBarChart className="h-4 w-4" /> },
    ...(((features as any).materials_access !== false) ? [{ label: "Materials", path: "/coach/materials", icon: <FileText className="h-4 w-4" /> }] : []),
    ...((features as any).external_materials_access ? [{ label: "Material Links", path: "/coach/external-materials", icon: <LinkIcon className="h-4 w-4" /> }] : []),
    ...(features.feed_access ? [
      { label: "Social Media", path: "/coach/social", icon: <Share2 className="h-4 w-4" /> },
    ] : []),
    ...(hasEmailAccess && features.messaging_access ? [{ label: "Campaigns", path: "/coach/campaigns", icon: <Megaphone className="h-4 w-4" /> }] : []),
    ...(hasWhatsAppAccess && features.messaging_access ? [{ label: "WhatsApp Campaigns", path: "/coach/whatsapp", icon: <MessageCircle className="h-4 w-4" /> }] : []),
    ...(hasWorkshopAccess && features.workshops_access ? [{ label: "Workshops", path: "/coach/workshops", icon: <Video className="h-4 w-4" /> }] : []),
    ...(dpAccess.enabled ? [{ label: "Digital Products", path: "/coach/digital-products", icon: <Package className="h-4 w-4" /> }] : []),
    { label: "Earnings", path: "/coach/earnings", icon: <DollarSign className="h-4 w-4" /> },
    { label: "Notifications", path: "/coach/notifications", icon: <Bell className="h-4 w-4" /> },
    { label: "Invite Coaches", path: "/coach/invite-coaches", icon: <UserPlus className="h-4 w-4" /> },
    { label: "Daily Zip", path: "/coach/daily-zip", icon: <Gamepad2 className="h-4 w-4" /> },
    { label: "Prompt Generator", path: "/coach/prompt-generator", icon: <Sparkles className="h-4 w-4" /> },
    { label: "My Website", path: "/coach/website", icon: <Globe className="h-4 w-4" /> },
    ...(linkedinEnabled ? [{ label: "LinkedIn Post", path: "/coach/linkedin-post", icon: <Share2 className="h-4 w-4" /> }] : []),
    { label: "SEO & Indexing", path: "/coach/seo", icon: <Search className="h-4 w-4" /> },
    { label: "Profile", path: "/coach/profile", icon: <User className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout navItems={navItems} title="Coach Dashboard" marqueeSegment="coach">
      <Routes>
        <Route path="courses" element={features.courses_access ? <CoachCourses /> : <Navigate to="overview" replace />} />
        <Route path="courses/new" element={features.courses_access ? <CoachCourseForm /> : <Navigate to="overview" replace />} />
        <Route path="courses/:id/edit" element={features.courses_access ? <CoachCourseForm /> : <Navigate to="overview" replace />} />
        <Route path="courses/:id/curriculum" element={features.courses_access ? <CurriculumBuilder /> : <Navigate to="overview" replace />} />
        <Route path="webinars" element={features.workshops_access ? <CoachWebinars /> : <Navigate to="overview" replace />} />
        <Route path="enrollments" element={<CoachEnrollments />} />
        <Route path="clients" element={(features as any).crm_access ? <CoachClients /> : <Navigate to="overview" replace />} />
        <Route path="leads" element={(features as any).leads_access ? <CoachLeads /> : <Navigate to="overview" replace />} />
        <Route path="sessions" element={(features as any).sessions_access ? <CoachSessions /> : <Navigate to="overview" replace />} />
        <Route path="progress" element={(features as any).progress_access ? <CoachProgress /> : <Navigate to="overview" replace />} />
        <Route path="packages" element={(features as any).packages_access ? <CoachPackages /> : <Navigate to="overview" replace />} />
        <Route path="automations" element={(features as any).automations_access ? <CoachAutomations /> : <Navigate to="overview" replace />} />
        <Route path="copilot" element={(features as any).copilot_access ? <CoachCopilot /> : <Navigate to="overview" replace />} />
        <Route path="content-studio" element={(features as any).content_studio_access ? <CoachContentStudio /> : <Navigate to="overview" replace />} />
        <Route path="insights" element={<CoachCampaignInsights />} />
        <Route path="reports" element={<CoachReportBuilder />} />
        <Route path="materials" element={((features as any).materials_access !== false) ? <CoachMaterials /> : <Navigate to="overview" replace />} />
        <Route path="materials/library" element={<DashboardMaterials />} />
        <Route path="external-materials" element={(features as any).external_materials_access ? <CoachExternalMaterials /> : <Navigate to="overview" replace />} />
        <Route path="social" element={features.feed_access ? <SocialMediaHub /> : <Navigate to="overview" replace />} />
        <Route path="campaigns" element={hasEmailAccess && features.messaging_access ? <CoachCampaigns /> : <Navigate to="overview" replace />} />
        <Route path="whatsapp" element={hasWhatsAppAccess && features.messaging_access ? <CoachWhatsApp /> : <Navigate to="overview" replace />} />
        <Route path="workshops" element={hasWorkshopAccess && features.workshops_access ? <CoachWorkshops /> : <Navigate to="overview" replace />} />
        <Route path="earnings" element={<CoachEarnings />} />
        <Route path="notifications" element={<CoachNotificationRequests />} />
        <Route path="invite-coaches" element={<CoachReferrals />} />
        <Route path="daily-zip" element={<DailyZip />} />
        <Route path="profile" element={<CoachProfile />} />
        <Route path="prompt-generator" element={<div className="space-y-4"><h2 className="text-xl font-bold text-foreground">Prompt Generator</h2><div className="rounded-xl border border-border bg-card p-6"><PromptGeneratorForm showSave userRole="coach" /></div></div>} />
        <Route path="website" element={<CoachWebsiteManager />} />
        <Route path="seo" element={<CoachSEOPanel />} />
        <Route path="blueprint" element={<CoachBlueprintWorkspace />} />
        <Route path="linkedin-post" element={linkedinEnabled ? <CoachLinkedInPost /> : <Navigate to="overview" replace />} />
        <Route path="digital-products/*" element={<CoachDigitalProducts />} />
        <Route path="overview" element={<CoachOverview />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default CoachDashboard;
