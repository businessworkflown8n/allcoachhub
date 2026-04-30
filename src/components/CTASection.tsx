import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/TranslationProvider";
import { trackCtaClick } from "@/lib/analytics";

const CTASection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handlePrimaryCta = () => {
    trackCtaClick("Start Learning Today", "cta_section", "/auth?mode=signup");
    navigate("/auth?mode=signup");
  };

  const handleSecondaryCta = () => {
    trackCtaClick("Browse Coaches", "cta_section", "#coaches");
    document.getElementById("coaches")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-12 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 text-center sm:p-12 md:p-16">
          <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">{t("cta.title")}</h2>
          <p className="mb-8 text-muted-foreground">
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button onClick={handlePrimaryCta} className="cta-3d primary lg">
              {t("cta.primary")} <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={handleSecondaryCta} className="cta-3d secondary lg">
              {t("cta.secondary")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
