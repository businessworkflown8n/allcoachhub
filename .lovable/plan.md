## Premium Coach Website & Landing Page Builder Upgrade

This is a very large scope. To ship something production-ready (not a mockup), I'm proposing a **phased plan**. Phase 1 ships now end-to-end; Phases 2–4 follow in subsequent prompts. Existing coach websites & landing pages remain fully functional throughout.

---

### Scope reality check

The original prompt covers ~80 distinct features (drag-drop builder, GrapesJS, Three.js, GSAP, AI generators, heatmaps, mega menus, custom domains, Zapier/n8n, AMP, A/B testing, etc.). Building all of that in one go would take weeks and would ship broken. Instead I'll deliver a **premium, conversion-focused upgrade** of the *existing* coach website builder that already lives at `/coach/website` and `/coach-website/:slug`, then layer advanced builder features after.

Tech note: This project is **React 18 + Vite + Tailwind** (not Next.js). I'll use Framer Motion (already common in the stack), Tailwind, and the existing Supabase backend. No GrapesJS / Three.js / Next.js migration — those would require rewriting the platform.

---

### Phase 1 — Premium Templates + Custom Header + Hero/CTA Polish (ships now)

**1. Remove default Navbar from coach websites**
- `src/pages/CoachWebsite.tsx`: replace `<Navbar customLogo... />` with a new `<CoachWebsiteHeader />` driven entirely by the coach's own settings (logo, menu items, CTA button, social icons, sticky/transparent toggle, mobile hamburger).
- Add `header_config` JSONB column to `coach_websites` (menu items, style, CTA, socials, sticky/transparent flags).

**2. Premium Template Library (10 ready-made templates to start)**
- New table `coach_website_templates` (name, category, preview_image, content_sections JSON, theme_color, layout_variant, is_premium).
- Seed 10 templates across the highest-impact categories: AI Coaching, Business Coaching, Fitness, Trading, Digital Marketing, Webinar Funnel, Masterclass, Consulting, High-Ticket Funnel, Lead Gen.
- New page `src/pages/coach/WebsiteTemplates.tsx` — gallery with category filter, preview, "Use this template" → clones config into the coach's `coach_websites` row.
- Admin moderation: add `is_published`, `created_by` so admins can add/approve templates from `/admin` (Phase 2 adds full admin UI; Phase 1 ships seeded templates).

**3. Premium Hero + 3D CTA upgrade**
- Refactor `CoachWebsiteHero.tsx` with: gradient/particle background option, glassmorphism card, 3D-style CTA (depth shadow, glow, magnetic hover via Framer Motion), animated stats counter, fade-in on scroll.
- Add `hero_variant` field (`classic | gradient | video | particle`) chosen per template.
- New shared component `Premium3DButton` reusable across all CTAs (Book Demo, Enroll, Final CTA).

**4. Premium animations layer**
- Add Framer Motion-based fade/slide/scale for every section on scroll.
- Glassmorphism utility classes in `index.css` (`.glass-card`, `.neon-glow`, `.magnetic-hover`).
- Smooth scroll already enabled — verify and polish.

**5. Layout variants per template**
- Each section component (`CoachWebsiteCourses`, `CoachWebsiteTestimonials`, `CoachWebsiteFAQ`, `CoachWebsiteFinalCTA`) gets a `variant` prop (`classic | grid | carousel | spotlight`) so templates render visibly different.

**6. Coach builder UX upgrades (in `/coach/website`)**
- "Choose Template" entry point at top of the builder.
- New "Header & Menu" tab — manage logo, favicon, menu items (drag-reorder), CTA button, social icons, sticky/transparent toggles, WhatsApp floating button.
- Live mobile/tablet/desktop preview toggle (CSS-based, no rebuild).

---

### Phase 2 — Advanced Builder + AI Assist (follow-up prompt)
- Section-level drag-reorder + show/hide for all 12+ sections
- Inline text editing inside the preview iframe
- AI Headline / CTA / SEO Meta generator (Lovable AI Gateway, Gemini)
- Reusable "Save as my template"
- 6 more premium templates

### Phase 3 — Forms, Funnels, Integrations
- Multi-step forms, conditional fields, OTP
- Webhook + Zapier-style outbound, GTM/Meta Pixel field, custom CSS/JS
- Countdown timer, scarcity widgets, sticky CTA bar with offer

### Phase 4 — Analytics + Custom Domain + Admin Template Studio
- Per-page visitor / conversion / device analytics (already partly in `landing_pages` analytics)
- Custom domain workflow (admin approval)
- Admin Template Studio (create/edit/publish premium templates from `/admin`)
- A/B testing, heatmap (Microsoft Clarity embed)

---

### Files Phase 1 will touch

**Database (one migration)**
- `coach_websites`: add `header_config JSONB`, `hero_variant TEXT`, `template_id UUID`, `animation_enabled BOOLEAN`
- `coach_website_templates`: new table + RLS (public read for `is_published`, admin write)
- Seed 10 templates

**New files**
- `src/components/coach-website/CoachWebsiteHeader.tsx` (replaces default Navbar on public coach sites)
- `src/components/coach-website/Premium3DButton.tsx`
- `src/components/coach/website/HeaderMenuEditor.tsx`
- `src/components/coach/website/TemplateGallery.tsx`
- `src/pages/coach/WebsiteTemplates.tsx`
- `src/lib/coachWebsiteTemplates.ts` (template seed metadata helpers)

**Edited**
- `src/pages/CoachWebsite.tsx` — swap Navbar for CoachWebsiteHeader, pass variants
- `src/components/coach-website/CoachWebsiteHero.tsx` — premium hero variants + 3D CTA
- All `CoachWebsite*` section components — accept optional `variant` prop, add Framer Motion entrance animations
- `src/index.css` — glassmorphism, neon glow, 3D button utilities
- The existing `/coach/website` builder page — add "Templates" + "Header & Menu" tabs

---

### What I will NOT do in Phase 1 (and why)
- **Full GrapesJS / drag-drop free-form builder** — replacing the structured builder breaks SEO, RLS-validated content, and the existing approval workflow. We keep the section-based model and add variants instead.
- **Three.js / WebGL hero** — heavy bundle, hurts mobile performance budget (90+ score requirement in your memory).
- **Custom domains, AMP, n8n/Zapier** — separate infra work, scheduled for Phase 3/4.
- **Next.js migration** — project is Vite + React 18; switching frameworks would break everything.

---

### Confirm to proceed
Reply **"Approved"** and I'll ship Phase 1 in this thread (migration + ~12 files). If you want any Phase 2/3/4 item pulled into Phase 1, name it and I'll re-scope.
