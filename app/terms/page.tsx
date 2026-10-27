import LegalPage from "@/components/LegalPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("/terms", "Terms of service", "The terms for using the Gravityy Studio website and for projects, payments, ownership and support.");

export default function Terms() {
  return (
    <LegalPage
      title="Terms"
      path="/terms"
      lede="The short version of how we work together. Each project also has its own signed proposal."
      updated="27 October 2026"
      sections={[
        ["This website", ["Content on this site is for information. Prices shown are starting prices; your proposal sets the final scope, price and timeline."]],
        [
          "Projects",
          ["Every project starts with a written proposal covering scope, deliverables, timeline and price. If the proposal and these terms disagree, the proposal wins."],
        ],
        [
          "Payments",
          [
            "Prices in INR exclude 18% GST, which is added at checkout. International clients are billed in USD.",
            "Build projects are paid in the instalments set in the proposal. Grow plans are billed monthly and can be cancelled before the next billing date.",
          ],
        ],
        ["Ownership", ["You own the code, design files and accounts we create for you once the final payment is made. We may show the work in our portfolio unless you ask us not to."]],
        ["Support", ["Every build includes 30 days of support after launch for fixes to what we delivered. Ongoing work continues on a Grow plan or a maintenance retainer."]],
        ["Liability", ["We take care to deliver working, secure software, but our total liability for a project is limited to the fees paid for it."]],
        ["Law", ["These terms are governed by the laws of India. Questions: hello@gravityystudio.com."]],
      ]}
    />
  );
}
