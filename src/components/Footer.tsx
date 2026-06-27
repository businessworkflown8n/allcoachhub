import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";
import { trackSocialClick } from "@/lib/analytics";
import MarqueeBar from "@/components/MarqueeBar";

const socials = [
  { name: "X", href: "https://x.com/Aicoachportal", icon: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  )},
  { name: "LinkedIn", href: "https://www.linkedin.com/company/aicoachportal/", icon: Linkedin },
  { name: "Instagram", href: "https://www.instagram.com/aicoachportal/", icon: Instagram },
  { name: "Facebook", href: "https://www.facebook.com/people/Aicoachportal/61588588206814/", icon: Facebook },
  { name: "YouTube", href: "https://www.youtube.com/@AicoachPortal", icon: Youtube },
];

const legalLinks = [
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Return & Refund Policy", to: "/refund-policy" },
  { label: "Cancellation Policy", to: "/cancellation-policy" },
  { label: "Shipping Policy", to: "/shipping-policy" },
  { label: "Terms & Conditions", to: "/terms" },
  { label: "Disclaimer", to: "/disclaimer" },
];

const Footer = () => {
  const { t } = useTranslation();

  const handleSocialClick = (name: string, href: string) => {
    trackSocialClick(name, href);
  };

  return (
    <>
      <MarqueeBar segment="website" position="footer" />
      <footer className="border-t border-border bg-card py-10">
        <div className="container mx-auto px-4">
          <div className="mb-8 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                Privacy & Legal
              </h3>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {legalLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Follow Us
              </h3>
              <div className="flex items-center gap-3">
                {socials.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    onClick={() => handleSocialClick(s.name, s.href)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <s.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("footer.copyright", { year: new Date().getFullYear().toString() })}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
