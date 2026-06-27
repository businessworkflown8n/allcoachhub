export type LegalSlug =
  | "privacy-policy"
  | "refund-policy"
  | "cancellation-policy"
  | "shipping-policy"
  | "terms"
  | "disclaimer";

export interface LegalDoc {
  slug: LegalSlug;
  title: string;
  description: string;
  body: string;
}

const COMPANY = "AI Coach Portal";
const SITE = "https://www.aicoachportal.com";
const SUPPORT_EMAIL = "support@aicoachportal.com";
const SUPPORT_PHONE = "+91-00000-00000";
const LAST_UPDATED = "27 June 2026";

export const LEGAL_DOCS: Record<LegalSlug, LegalDoc> = {
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description: `Read the ${COMPANY} Privacy Policy describing how we collect, use, store, and protect your personal information.`,
    body: `_Last Updated: ${LAST_UPDATED}_

${COMPANY} ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit ${SITE} or use our services.

## 1. Information We Collect

We may collect the following categories of information:

- **Personal Information** — name, email address, mobile number, billing/shipping address, profile photo, date of birth (where applicable).
- **Account Information** — username, password (encrypted), authentication tokens, role (learner / coach / admin).
- **Payment Information** — processed securely via PCI-DSS compliant gateways (Razorpay, Cashfree, PhonePe, PayU, Stripe). We do not store full card numbers or CVV on our servers.
- **Usage Information** — pages visited, courses viewed, time spent, device, browser, IP address, location (approximate).
- **Content You Submit** — course enrolments, reviews, messages, support requests, uploaded files.

## 2. How We Use Your Information

We use your information to:

- Provide, operate, and improve our courses, webinars, and coaching services.
- Process transactions and send purchase confirmations, invoices, and receipts.
- Send service notifications, course updates, and educational communications.
- Personalize content, recommendations, and marketing (with your consent).
- Detect, prevent, and respond to fraud, abuse, and security incidents.
- Comply with applicable laws and regulatory obligations in India and abroad.

## 3. Cookies and Tracking Technologies

We use cookies, web beacons, and similar technologies for authentication, analytics (Google Analytics, GTM), session management, and personalization. You can disable cookies via your browser settings; some features may not function correctly without them.

## 4. Third-Party Integrations

We share data only with trusted service providers who help us operate our platform, including:

- Payment gateways (Razorpay, Cashfree, PhonePe, PayU, Stripe)
- Email delivery (Resend), WhatsApp messaging providers, and SMS providers
- Cloud hosting and database services
- Analytics and crash-reporting providers
- AI providers (for AI tutoring, content generation, and chatbot features)

Each provider is contractually obligated to protect your data.

## 5. Data Storage and Security

Your data is stored on secure servers with industry-standard safeguards including TLS encryption in transit, encryption at rest, role-based access controls, and audit logging. While no system is 100% secure, we follow best practices aligned with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.

## 6. Your Rights

Subject to applicable law, you have the right to:

- Access, correct, or update your personal information from your dashboard.
- Request deletion of your account and associated data.
- Withdraw consent for marketing communications at any time.
- Request a copy of the personal data we hold about you.
- Lodge a complaint with the relevant data protection authority.

To exercise these rights, email us at **${SUPPORT_EMAIL}**.

## 7. Communication Preferences

You may opt out of promotional emails using the "Unsubscribe" link in any email. Transactional emails (order confirmations, password resets, account notifications) cannot be opted out of while your account remains active.

## 8. Children's Privacy

Our services are intended for users aged 13 and above. For users under 18 (including our AI Kids Pro program), we require verifiable parental consent and may collect only limited information necessary to deliver the program. We do not knowingly collect data from children under 13 without parental consent.

## 9. Data Retention

We retain personal data for as long as your account is active or as required to fulfil the purposes outlined in this policy, comply with legal obligations, resolve disputes, and enforce agreements.

## 10. International Data Transfers

Your information may be processed in countries other than your country of residence. We ensure appropriate safeguards are in place for any cross-border transfer.

## 11. Updates to This Policy

We may update this Privacy Policy from time to time. Material changes will be notified via email or a prominent notice on the website. The "Last Updated" date at the top will always reflect the current version.

## 12. Contact Us

For privacy-related questions, requests, or complaints:

- **Email:** ${SUPPORT_EMAIL}
- **Phone:** ${SUPPORT_PHONE}
- **Website:** ${SITE}
`,
  },
  "refund-policy": {
    slug: "refund-policy",
    title: "Return & Refund Policy",
    description: `Understand the ${COMPANY} refund eligibility, request process, and timelines for our digital products and services.`,
    body: `_Last Updated: ${LAST_UPDATED}_

At ${COMPANY}, we strive to deliver high-quality digital learning experiences. This Return & Refund Policy explains when and how refunds are processed for purchases made on ${SITE}.

## 1. Eligibility for Refunds

You may be eligible for a refund if:

- A technical issue on our platform prevented you from accessing the purchased course, webinar, or material, and our support team was unable to resolve it within a reasonable time.
- You were charged in error or charged multiple times for the same product.
- The product description was materially inaccurate.

## 2. Non-Refundable Products & Services

The following are **non-refundable** unless explicitly stated otherwise:

- Courses or modules where more than 20% of the content has been consumed.
- Live webinars or 1:1 coaching sessions that have already commenced or been attended.
- Downloadable resources, e-books, templates, and prompt libraries once downloaded.
- Subscription plans after the first 24 hours of activation.
- Certification fees once a certificate has been issued.
- Customised coaching packages and one-time consulting fees.

## 3. Refund Request Window

Refund requests must be raised **within 1 (one) day of the purchase**, unless a longer period is explicitly specified in the product description or coaching agreement.

Requests received after this window will not be accepted except in cases of confirmed technical failure attributable to us.

## 4. How to Request a Refund

Send a refund request to **${SUPPORT_EMAIL}** with the following details:

- Registered email address and full name
- Order ID / transaction reference
- Date of purchase
- Reason for the refund request
- Supporting screenshots (if any)

## 5. Approval Process

Our team will review your request within **3 (three) business days** and notify you of the outcome by email. We may request additional information before issuing a decision.

## 6. Refund Mode

Approved refunds are processed to the **original payment method** used at the time of purchase. We do not issue refunds via cheque, cash, or to an alternative account, except where the original method is unavailable.

## 7. Refund Processing Timeline

Once approved, refunds are typically credited to your account within **5–10 business days**. The exact timeline depends on your bank or payment provider. Cross-border or international refunds may take up to 14 business days.

## 8. Chargebacks

Initiating a chargeback without first contacting us may result in suspension of your account. We encourage you to reach out so we can resolve concerns amicably.

## 9. Contact for Refunds

- **Email:** ${SUPPORT_EMAIL}
- **Phone:** ${SUPPORT_PHONE}
`,
  },
  "cancellation-policy": {
    slug: "cancellation-policy",
    title: "Cancellation Policy",
    description: `Review the ${COMPANY} cancellation rules for courses, webinars, coaching sessions, and subscriptions.`,
    body: `_Last Updated: ${LAST_UPDATED}_

This Cancellation Policy describes when and how you may cancel a purchase or subscription on ${SITE}.

## 1. Cancellation Eligibility

Cancellation is permitted in the following situations:

- **Courses:** Before course access is activated or before more than 20% of the course content has been consumed.
- **Webinars / Live Events:** Up to **24 hours before** the scheduled start time.
- **1:1 Coaching Sessions:** Up to **24 hours before** the scheduled session time.
- **Subscriptions:** At any time; cancellation takes effect at the end of the current billing cycle.

## 2. How to Request Cancellation

Cancellations can be requested by:

1. Logging into your dashboard and using the **Cancel** option on the order or subscription.
2. Emailing **${SUPPORT_EMAIL}** with your order ID and reason.

## 3. Cancellation Window

- Webinars / 1:1 sessions: 24 hours prior to start.
- Courses: prior to activation or within the refund window described in our Return & Refund Policy.
- Subscriptions: any time before the next billing date.

## 4. Non-Cancellable Services

The following cannot be cancelled once confirmed:

- Live webinars or coaching sessions that have already begun.
- Customised coaching engagements that have been initiated.
- Issued digital certificates and graded assessments.
- Promotional or limited-time offers explicitly marked as non-cancellable.

## 5. Confirmation Process

Once a cancellation is processed, you will receive a confirmation email with reference to any applicable refund (subject to the Return & Refund Policy). If you do not receive a confirmation within 48 hours, please contact us.

## 6. Customer Support

- **Email:** ${SUPPORT_EMAIL}
- **Phone:** ${SUPPORT_PHONE}
`,
  },
  "shipping-policy": {
    slug: "shipping-policy",
    title: "Shipping & Delivery Policy",
    description: `Understand how ${COMPANY} delivers digital products, courses, webinars, and downloadable resources.`,
    body: `_Last Updated: ${LAST_UPDATED}_

${COMPANY} primarily delivers **digital products and services**. This Shipping & Delivery Policy explains how and when you receive access to your purchases.

## 1. Digital Product Delivery

Digital products including online courses, webinars, memberships, certificates, prompt libraries, e-books, and downloadable resources are delivered electronically.

- **Instant delivery:** Access is granted immediately after successful payment confirmation. You will receive an email with login and access instructions.
- **Scheduled delivery:** For scheduled cohorts, webinars, and live programs, access is granted at the announced start date and time.
- **Manual approval:** Where the program requires manual approval (e.g. AI Kids Pro, specialised coaching), access is granted within **24–48 hours** of payment confirmation.

## 2. Access Instructions

After purchase:

1. Check your registered email for the access link and login credentials.
2. Sign in at ${SITE} using your registered email.
3. Visit your **Learner Dashboard** → "My Courses" / "My Webinars" / "Materials" to access your content.

If you do not see your purchase, please refresh the page or sign out and back in.

## 3. Delivery Timeline

- Digital downloads & course access: **immediately** after payment.
- Live session / webinar access: **at the scheduled time**.
- Certificate issuance: **within 24–72 hours** of course completion.
- Manual-approval products: **within 24–48 hours**.

## 4. Technical Issues & Delayed Delivery

If you do not receive access within the expected timeline, please:

- Verify your payment was successful via your bank or payment provider.
- Check your spam / junk folder for the access email.
- Contact **${SUPPORT_EMAIL}** with your order ID. We typically respond within 24 business hours.

## 5. Future Physical Product Shipping

If we introduce physical products (such as printed workbooks, certificates, or merchandise) in the future, the following will apply:

- **Processing time:** 2–4 business days from order confirmation.
- **Shipping duration:** 5–10 business days within India; 10–21 business days internationally.
- **Courier partners:** Reputed couriers including Bluedart, DTDC, Delhivery, India Post, or DHL/FedEx for international orders.
- **Tracking:** A tracking ID will be emailed to you once the shipment leaves our facility.
- Shipping charges, taxes, and customs duties (if any) will be displayed at checkout.

## 6. Contact Us

- **Email:** ${SUPPORT_EMAIL}
- **Phone:** ${SUPPORT_PHONE}
`,
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    description: `Review the ${COMPANY} Terms & Conditions governing the use of our website, courses, and services.`,
    body: `_Last Updated: ${LAST_UPDATED}_

These Terms & Conditions ("Terms") govern your access to and use of ${SITE} and all related services operated by ${COMPANY}. By using our platform, you agree to be bound by these Terms.

## 1. Eligibility

You must be at least 18 years old, or 13+ with verifiable parental consent (for the AI Kids program), to use our services.

## 2. Account Responsibilities

You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account.

## 3. Acceptable Use

You agree not to:

- Misuse, reverse engineer, or attempt to gain unauthorised access to the platform.
- Share course content, recordings, or proprietary materials without written permission.
- Upload unlawful, infringing, or harmful content.
- Use the platform to harass, abuse, or impersonate others.

## 4. Intellectual Property

All content, including courses, videos, designs, logos, and software, is the property of ${COMPANY} or its licensors and is protected by copyright and intellectual property laws.

## 5. Payments

Prices are listed in INR (or as displayed). Payments are processed via certified gateways. Taxes, where applicable, are added at checkout.

## 6. Coach Marketplace

Coaches who list services on our platform are independent contractors. ${COMPANY} acts as a facilitator and is not directly responsible for the quality of individual coaching engagements but provides quality assurance and dispute resolution.

## 7. Limitation of Liability

To the maximum extent permitted by law, ${COMPANY} is not liable for indirect, incidental, or consequential damages arising from your use of the platform.

## 8. Termination

We may suspend or terminate your account if you violate these Terms.

## 9. Governing Law

These Terms are governed by the laws of India. Disputes will be subject to the exclusive jurisdiction of the courts in your registered city of operation.

## 10. Contact

- **Email:** ${SUPPORT_EMAIL}
- **Phone:** ${SUPPORT_PHONE}
`,
  },
  disclaimer: {
    slug: "disclaimer",
    title: "Disclaimer",
    description: `Read the ${COMPANY} disclaimer regarding educational content, coaching advice, and earning representations.`,
    body: `_Last Updated: ${LAST_UPDATED}_

The information provided on ${SITE} ("we", "our", "us") is for general educational and informational purposes only. By using our website and services, you agree to the following disclaimers:

## 1. Educational Content

All courses, webinars, and materials are intended to provide educational guidance. They do not constitute professional, legal, financial, medical, or career advice. Consult qualified professionals for specific advice.

## 2. No Guarantees of Results

While we strive to provide high-quality content, individual results from applying course material vary based on effort, experience, and external factors. We do not guarantee any specific income, career outcome, or learning result.

## 3. Coach Independence

Coaches on the platform are independent professionals. Opinions and methods expressed by individual coaches are their own and do not necessarily reflect those of ${COMPANY}.

## 4. Third-Party Links

Our website may contain links to third-party websites. We are not responsible for the content, policies, or practices of those sites.

## 5. AI-Generated Content

Some features (chatbot, AI tutor, prompt generator, content recommendations) use artificial intelligence and may produce inaccurate or outdated information. Always verify critical information independently.

## 6. Limitation

To the fullest extent permitted by law, ${COMPANY} disclaims all warranties, express or implied, regarding the accuracy, reliability, or completeness of any content.

## 7. Contact

- **Email:** ${SUPPORT_EMAIL}
- **Phone:** ${SUPPORT_PHONE}
`,
  },
};

export const LEGAL_SLUGS: LegalSlug[] = [
  "privacy-policy",
  "refund-policy",
  "cancellation-policy",
  "shipping-policy",
  "terms",
  "disclaimer",
];
