import LegalPage from "@/components/LegalPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("/privacy", "Privacy policy", "What Gravityy Studio collects through this website, why, who processes it and how to have it corrected or deleted.");

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      path="/privacy"
      lede="What we collect through this site, why, and how to have it removed."
      updated="27 October 2026"
      sections={[
        ["Who we are", ["Gravityy Studio is a digital studio based in India. For anything in this policy, write to hello@gravityystudio.com."]],
        [
          "What we collect",
          [
            "Only what you send us: your website address and work email when you request a free audit; your name, email and message when you contact us; your email when you join the newsletter; and the details needed for an account, a project or an invoice if you become a client.",
            "We also collect anonymous usage data (pages viewed, device type, approximate country) to understand how the site is used.",
          ],
        ],
        [
          "Why we use it",
          ["To reply to you, prepare the audit you asked for, send the newsletter you subscribed to, deliver and bill client work, and improve this site. We do not sell your data or use it for advertising profiles."],
        ],
        [
          "Who processes it",
          [
            "Data is stored with Supabase. Emails are delivered through Resend. The site is hosted on Vercel, which also provides privacy-friendly analytics. Payments are handled by Razorpay or Stripe; we never see or store full card details.",
            "Each provider processes data only to run its part of the service.",
          ],
        ],
        ["Cookies", ["The site works without tracking cookies. Signing in to the client area sets a session cookie needed to keep you signed in. A theme or sound choice you make on the site is remembered in your own browser only."]],
        ["How long we keep it", ["Audit and contact requests are kept for up to 24 months; newsletter subscriptions until you unsubscribe; client and billing records as long as the law requires."]],
        [
          "Your rights",
          ["You can ask for a copy of your data, have it corrected, or have it deleted, under India's Digital Personal Data Protection Act 2023 and, where it applies to you, the GDPR. Email hello@gravityystudio.com and we will respond within 30 days."],
        ],
      ]}
    />
  );
}
