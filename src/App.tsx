import { lazy, Suspense } from "react";
import { Phone, MessageCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCommunicationSettings } from "@/hooks/useCommunicationSettings";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { LocaleProvider } from "@/hooks/useLocale";
import { TranslationProvider } from "@/i18n/TranslationProvider";
const Index = lazy(() => import("./pages/Index"));

// Lazy-loaded routes
const RoleSelect = lazy(() => import("./pages/RoleSelect"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ThankYouLearner = lazy(() => import("./pages/ThankYouLearner"));
const ThankYouCoach = lazy(() => import("./pages/ThankYouCoach"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminOTPLogin = lazy(() => import("./pages/AdminOTPLogin"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const CoursePlayer = lazy(() => import("./pages/CoursePlayer"));
const Enroll = lazy(() => import("./pages/Enroll"));
const RedeemInvite = lazy(() => import("./pages/RedeemInvite"));
const LearnerDashboard = lazy(() => import("./pages/LearnerDashboard"));
const CoachDashboard = lazy(() => import("./pages/CoachDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AIBlogs = lazy(() => import("./pages/AIBlogs"));
const AIBlogsCategory = lazy(() => import("./pages/AIBlogsCategory"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Courses = lazy(() => import("./pages/Courses"));
const Webinars = lazy(() => import("./pages/Webinars"));
// DailyZip is now only inside dashboards (/learner/daily-zip and /coach/daily-zip)
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Install = lazy(() => import("./pages/Install"));
const CoachLanding = lazy(() => import("./pages/CoachLanding"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const AISeoPrompt = lazy(() => import("./pages/AISeoPrompt"));
const Materials = lazy(() => import("./pages/Materials"));
const MaterialDetail = lazy(() => import("./pages/MaterialDetail"));
const PromptGenerator = lazy(() => import("./pages/PromptGenerator"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const Categories = lazy(() => import("./pages/Categories"));
const CoachCategoryPage = lazy(() => import("./pages/CoachCategoryPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CoachWebsite = lazy(() => import("./pages/CoachWebsite"));
const CoachWebsiteThankYou = lazy(() => import("./pages/CoachWebsiteThankYou"));
const BrowseCoaches = lazy(() => import("./pages/BrowseCoaches"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LandingPageThankYou = lazy(() => import("./pages/LandingPageThankYou"));
const KnowledgeHub = lazy(() => import("./pages/KnowledgeHub"));
const KnowledgeTopic = lazy(() => import("./pages/KnowledgeTopic"));
const KnowledgeQuestion = lazy(() => import("./pages/KnowledgeQuestion"));
const AiMastermindLearning = lazy(() => import("./pages/AiMastermindLearning"));
const AiJobsNewsLinkedInPost = lazy(() => import("./pages/AiJobsNewsLinkedInPost"));
const AIKidsEnrollment = lazy(() => import("./pages/AIKidsEnrollment"));
const AIKidsProCourses = lazy(() => import("./pages/AIKidsProCourses"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));

// Lazy-loaded global widgets (non-critical)

const ChatbotWidget = lazy(() => import("./components/ChatbotWidget"));
const WebsitePopup = lazy(() => import("./components/WebsitePopup"));
const FloatingPromptButton = lazy(() => import("./components/prompt/FloatingPromptButton"));
const AnalyticsTracker = lazy(() => import("./components/AnalyticsTracker"));
const PlanUpgradeModal = lazy(() => import("./components/plan/PlanUpgradeModal"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole: string }) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return <PageFallback />;
  }

  if (!user) return <Navigate to="/auth?mode=login" replace />;
  if (role !== allowedRole && allowedRole !== "any") return <Navigate to="/" replace />;

  return <>{children}</>;
};

const FloatingButtons = () => {
  const isMobile = useIsMobile();
  const { settings, loading } = useCommunicationSettings();
  const { role, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) return null;
  if (role === "learner" && !settings.show_to_learners) return null;
  if (role === "coach" && !settings.show_to_coaches) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {isMobile && settings.call_enabled && (
          <a
            href={`tel:${settings.call_number}`}
            className="group flex h-14 w-14 items-center justify-center rounded-full border border-foreground/20 bg-background/40 backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:scale-110 hover:shadow-[0_6px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]"
            aria-label="Call Us"
          >
            <Phone className="h-6 w-6 text-primary" />
          </a>
        )}
        {settings.whatsapp_enabled && (
          <a
            href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(settings.whatsapp_message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-14 w-14 items-center justify-center rounded-full border border-foreground/20 bg-background/40 backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:scale-110 hover:shadow-[0_6px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]"
            aria-label="WhatsApp"
          >
            <svg className="h-7 w-7 text-[hsl(142,70%,45%)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        )}
      </div>
      {settings.chatbot_enabled && (
        <Suspense fallback={null}>
          <ChatbotWidget />
        </Suspense>
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LocaleProvider>
      <TranslationProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          <Routes>
            <Route path="/" element={<Suspense fallback={<PageFallback />}><Index /></Suspense>} />
            <Route path="/auth" element={<Suspense fallback={<PageFallback />}><RoleSelect /></Suspense>} />
            <Route path="/login/:role" element={<Suspense fallback={<PageFallback />}><Login /></Suspense>} />
            <Route path="/signup/:role" element={<Suspense fallback={<PageFallback />}><Signup /></Suspense>} />
            <Route path="/signup/learner/thank-you-learner" element={<Suspense fallback={<PageFallback />}><ThankYouLearner /></Suspense>} />
            <Route path="/signup/coach/thank-you-coach" element={<Suspense fallback={<PageFallback />}><ThankYouCoach /></Suspense>} />
            <Route path="/admin/login" element={<Suspense fallback={<PageFallback />}><AdminLogin /></Suspense>} />
            <Route path="/admin/otp-login" element={<Suspense fallback={<PageFallback />}><AdminOTPLogin /></Suspense>} />
            <Route path="/reset-password" element={<Suspense fallback={<PageFallback />}><ResetPassword /></Suspense>} />
            <Route path="/ai-blogs" element={<Suspense fallback={<PageFallback />}><AIBlogs /></Suspense>} />
            <Route path="/ai-jobs-news/ai-research/ai-seo-prompt" element={<Suspense fallback={<PageFallback />}><AISeoPrompt /></Suspense>} />
            <Route path="/ai-jobs-news/:category" element={<Suspense fallback={<PageFallback />}><AIBlogsCategory /></Suspense>} />
            <Route path="/ai-blogs/:slug" element={<Suspense fallback={<PageFallback />}><BlogPost /></Suspense>} />
            <Route path="/daily-zip" element={<Navigate to="/auth?mode=login" replace />} />
            <Route path="/unsubscribe" element={<Suspense fallback={<PageFallback />}><Unsubscribe /></Suspense>} />
            <Route path="/install" element={<Suspense fallback={<PageFallback />}><Install /></Suspense>} />
            <Route path="/sitemap" element={<Suspense fallback={<PageFallback />}><Sitemap /></Suspense>} />
            <Route path="/verify-certificate/:token" element={<Suspense fallback={<PageFallback />}><VerifyCertificate /></Suspense>} />
            <Route path="/courses" element={<Suspense fallback={<PageFallback />}><Courses /></Suspense>} />
            <Route path="/courses/ai-kids-pro" element={<Suspense fallback={<PageFallback />}><AIKidsProCourses /></Suspense>} />
            <Route path="/courses/:slug" element={<Suspense fallback={<PageFallback />}><CategoryPage /></Suspense>} />
            <Route path="/categories" element={<Suspense fallback={<PageFallback />}><Categories /></Suspense>} />
            <Route path="/categories/:slug" element={<Suspense fallback={<PageFallback />}><CoachCategoryPage /></Suspense>} />
            <Route path="/prompt-engineering" element={<Suspense fallback={<PageFallback />}><CategoryPage /></Suspense>} />
            <Route path="/ai-agents" element={<Suspense fallback={<PageFallback />}><CategoryPage /></Suspense>} />
            <Route path="/llms-fine-tuning" element={<Suspense fallback={<PageFallback />}><CategoryPage /></Suspense>} />
            <Route path="/ai-automation" element={<Suspense fallback={<PageFallback />}><CategoryPage /></Suspense>} />
            <Route path="/no-code-ai" element={<Suspense fallback={<PageFallback />}><CategoryPage /></Suspense>} />
            <Route path="/ai-marketing" element={<Suspense fallback={<PageFallback />}><CategoryPage /></Suspense>} />
            <Route path="/generative-ai-for-developers" element={<Suspense fallback={<PageFallback />}><CategoryPage /></Suspense>} />
            <Route path="/ai-business" element={<Suspense fallback={<PageFallback />}><CategoryPage /></Suspense>} />
            <Route path="/webinars" element={<Suspense fallback={<PageFallback />}><Webinars /></Suspense>} />
            <Route path="/materials" element={<Suspense fallback={<PageFallback />}><Materials /></Suspense>} />
            <Route path="/materials/:slug" element={<Suspense fallback={<PageFallback />}><MaterialDetail /></Suspense>} />
            <Route path="/prompt-generator" element={<Suspense fallback={<PageFallback />}><PromptGenerator /></Suspense>} />
            <Route path="/knowledge" element={<Suspense fallback={<PageFallback />}><KnowledgeHub /></Suspense>} />
            <Route path="/knowledge/:topic" element={<Suspense fallback={<PageFallback />}><KnowledgeTopic /></Suspense>} />
            <Route path="/knowledge/:topic/:question" element={<Suspense fallback={<PageFallback />}><KnowledgeQuestion /></Suspense>} />
            <Route path="/coach/*" element={
              <ProtectedRoute allowedRole="coach">
                <Suspense fallback={<PageFallback />}><CoachDashboard /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/browse-coaches" element={<Suspense fallback={<PageFallback />}><BrowseCoaches /></Suspense>} />
            <Route path="/coach-profile/:slug" element={<Suspense fallback={<PageFallback />}><CoachLanding /></Suspense>} />
            <Route path="/coach-website/:slug" element={<Suspense fallback={<PageFallback />}><CoachWebsite /></Suspense>} />
            <Route path="/coach-website/:slug/thank-you" element={<Suspense fallback={<PageFallback />}><CoachWebsiteThankYou /></Suspense>} />
            <Route path="/course/:slug" element={<Suspense fallback={<PageFallback />}><CourseDetail /></Suspense>} />
            <Route path="/enroll/:courseId" element={
              <ProtectedRoute allowedRole="learner">
                <Suspense fallback={<PageFallback />}><Enroll /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/learn/:courseId" element={
              <ProtectedRoute allowedRole="learner">
                <Suspense fallback={<PageFallback />}><CoursePlayer /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/invite/:token" element={<Suspense fallback={<PageFallback />}><RedeemInvite /></Suspense>} />
            <Route path="/learner/*" element={
              <ProtectedRoute allowedRole="learner">
                <Suspense fallback={<PageFallback />}><LearnerDashboard /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRole="admin">
                <Suspense fallback={<PageFallback />}><AdminDashboard /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/oauth-callback" element={<Suspense fallback={<PageFallback />}><OAuthCallback /></Suspense>} />
            <Route path="/lp/:slug" element={<Suspense fallback={<PageFallback />}><LandingPage /></Suspense>} />
            <Route path="/lp/:slug/thank-you" element={<Suspense fallback={<PageFallback />}><LandingPageThankYou /></Suspense>} />
            <Route path="/Ai-mastermind-learning/:coachSlug" element={<Suspense fallback={<PageFallback />}><AiMastermindLearning /></Suspense>} />
            <Route path="/ai-mastermind-learning/:coachSlug" element={<Suspense fallback={<PageFallback />}><AiMastermindLearning /></Suspense>} />
            <Route path="/ai-jobs-news/linkedin-post" element={<Suspense fallback={<PageFallback />}><AiJobsNewsLinkedInPost /></Suspense>} />
            <Route path="/ai-kids/enrollment" element={<Suspense fallback={<PageFallback />}><AIKidsEnrollment /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
          </Routes>
          <FloatingButtons />
          <Suspense fallback={null}>
            <FloatingPromptButton />
          </Suspense>
          <Suspense fallback={null}>
            <WebsitePopup />
          </Suspense>
          <Suspense fallback={null}>
            <PlanUpgradeModal />
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      </TranslationProvider>
      </LocaleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
