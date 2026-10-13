"use client";
import { useActionState } from "react";
import { Github, Linkedin } from "lucide-react";
import { GoogleIcon } from "@/components/ui/BrandIcons";
import { SOCIAL, type SocialId } from "@/lib/auth-providers";
import { oauthSignIn, type AuthState } from "./actions";

const ICON: Record<SocialId, React.ReactNode> = {
  google: <GoogleIcon />,
  linkedin_oidc: <Linkedin size={18} aria-hidden="true" className="text-fg light:text-[#0A66C2]" />,
  github: <Github size={18} aria-hidden="true" />,
};

/** One button per provider enabled in Supabase. Submits to oauthSignIn, which redirects to the provider. */
export default function SocialButtons({ providers, next }: { providers: SocialId[]; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(oauthSignIn, {});
  if (!providers.length) return null;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      {SOCIAL.filter((p) => providers.includes(p.id)).map((p) => (
        <button
          key={p.id}
          type="submit"
          name="provider"
          value={p.id}
          disabled={pending}
          className="inline-flex min-h-[48px] items-center justify-center gap-3 rounded-full border border-line-strong bg-bg/40 px-6 text-[15px] font-medium transition-colors duration-200 hover:border-fg/60 hover:bg-fg/[0.04] disabled:opacity-50"
        >
          {ICON[p.id]}
          Continue with {p.label}
        </button>
      ))}
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <p className="my-2 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        or with email
        <span className="h-px flex-1 bg-line" />
      </p>
    </form>
  );
}
