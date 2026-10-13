import { ShieldCheck } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/env";
import { enabledSocial } from "@/lib/auth-providers";
import { safeNext } from "@/lib/safe-next";
import BrandMark from "@/components/ui/BrandMark";
import LoginForm from "./LoginForm";

export const metadata = { title: "Client login", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  confirm: "That confirmation link has expired or was already used. Sign in, or create the account again.",
  oauth: "Sign-in didn't complete (it was cancelled or the provider refused it). Please try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const providers = await enabledSocial();
  return (
    <main id="main" className="relative grid min-h-[100svh] place-items-center overflow-hidden px-4 pb-16 pt-32">
      <div aria-hidden="true" className="glow pointer-events-none absolute -right-[25vw] -top-[20vw] aspect-square w-[80vw] max-w-[900px] opacity-70" />
      <div className="card glass relative w-full max-w-[440px] p-7 sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <BrandMark height={28} />
          <div>
            <h1 className="text-2xl font-medium tracking-[-0.03em]">Client portal</h1>
            <p className="text-sm text-muted">Projects, invoices and billing in one place.</p>
          </div>
        </div>
        {sp.error && ERRORS[sp.error] && (
          <p role="alert" className="mb-6 rounded-2xl border border-danger/40 p-4 text-sm text-danger">
            {ERRORS[sp.error]}
          </p>
        )}
        {supabaseConfigured ? (
          <LoginForm next={next} providers={providers} />
        ) : (
          <div role="note" className="rounded-2xl border border-line bg-raised p-5 text-sm leading-relaxed text-muted">
            <p className="mb-2 font-medium text-fg">Sign-in isn&apos;t configured yet</p>
            Add <code className="font-mono text-fg">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="font-mono text-fg">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
            <code className="font-mono text-fg">.env.local</code>, apply <code className="font-mono text-fg">supabase/migrations</code> and{" "}
            <code className="font-mono text-fg">supabase/seed.sql</code>, then restart. See the README&apos;s Platform section.
          </div>
        )}
        <p className="mt-8 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <ShieldCheck size={14} aria-hidden="true" /> Supabase Auth · httpOnly JWT session
        </p>
      </div>
    </main>
  );
}
