"use client";
import { useActionState, useRef } from "react";
import { setRole, type Result } from "@/app/admin/actions";

/** Role change submits on select; you can't demote yourself (prevents locking the last admin out). */
export default function RoleSelect({ userId, role, self }: { userId: string; role: string; self: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<Result, FormData>(setRole, {});
  return (
    <form ref={form} action={action} className="flex items-center gap-3">
      <input type="hidden" name="user_id" value={userId} />
      <select
        name="role"
        defaultValue={role}
        disabled={self || pending}
        aria-label="Role"
        onChange={() => form.current?.requestSubmit()}
        className="min-h-[40px] rounded-full border border-line bg-bg px-3 text-sm disabled:opacity-60"
      >
        <option value="client">Client</option>
        <option value="admin">Admin</option>
      </select>
      <span role="status" className={`text-[13px] ${state.error ? "text-danger" : "text-accent"}`}>
        {state.error ?? (state.ok ? "Updated" : self ? "You" : "")}
      </span>
    </form>
  );
}
