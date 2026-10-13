"use client";
import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";
import Button from "@/components/ui/Button";
import type { SocialId } from "@/lib/auth-providers";
import SocialButtons from "./SocialButtons";

const MODES = [
  { id: "signin", label: "Sign in" },
  { id: "signup", label: "Create account" },
] as const;

export default function LoginForm({ next, providers }: { next: string; providers: SocialId[] }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<AuthState, FormData>((s, f) => authenticate(mode, s, f), {});

  return (
    <div className="rise">
      <div role="tablist" aria-label="Account" className="mb-8 grid grid-cols-2 rounded-full border border-line p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`min-h-[44px] rounded-full text-[15px] font-medium transition-colors duration-300 ${mode === m.id ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <SocialButtons providers={providers} next={next} />
      <form action={action} className="mt-4 flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && (
          <label className="flex flex-col gap-2 text-sm font-medium">
            Full name
            <input name="full_name" autoComplete="name" className="field" />
          </label>
        )}
        <label className="flex flex-col gap-2 text-sm font-medium">
          Email
          <input name="email" type="email" autoComplete="email" required className="field" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Password
          <input name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required className="field" />
        </label>
        <p role="status" className={`min-h-5 text-sm ${state.error ? "text-danger" : "text-accent"}`}>
          {state.error ?? state.message}
        </p>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
