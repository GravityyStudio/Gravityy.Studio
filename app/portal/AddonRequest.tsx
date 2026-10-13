"use client";
import { useActionState } from "react";
import Button from "@/components/ui/Button";
import { requestAddon, type ProfileState } from "./actions";

export default function AddonRequest({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(requestAddon, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="addon_id" value={id} />
      <Button type="submit" variant="ghost" disabled={pending || Boolean(state.ok)}>
        {state.ok ? "Requested" : pending ? "Sending…" : `Request ${name}`}
      </Button>
      <p role="status" className={`text-[13px] ${state.error ? "text-danger" : "text-accent"}`}>
        {state.error ?? (state.ok ? "Sent to Service requests." : "")}
      </p>
    </form>
  );
}
