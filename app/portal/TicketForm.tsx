"use client";
import { useActionState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { createTicket, type ProfileState } from "./actions";

/** Support ticket or service request (kind is fixed per page). Requests can name the service they're about. */
export default function TicketForm({ kind, services = [] }: { kind: "support" | "request"; services?: string[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ProfileState, FormData>(createTicket, {});
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  const request = kind === "request";

  return (
    <form ref={form} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="kind" value={kind} />
      <label className="flex flex-col gap-2 text-sm font-medium">
        {request ? "What do you need?" : "Subject"}
        <input name="subject" required minLength={3} maxLength={160} placeholder={request ? "e.g. A landing page for our autumn sale" : "e.g. Contact form not sending"} className="field" />
      </label>
      <div className={`grid gap-3 ${request && services.length ? "sm:grid-cols-2" : ""}`}>
        {request && services.length > 0 && (
          <label className="flex flex-col gap-2 text-sm font-medium">
            Service
            <select name="service" defaultValue="" className="field">
              <option value="">Not sure yet</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-2 text-sm font-medium">
          {request ? "Urgency" : "Priority"}
          <select name="priority" defaultValue="normal" className="field">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Details
        <textarea name="body" rows={5} maxLength={5000} placeholder={request ? "Goals, deadlines, links, budget…" : "What happened, where, and how to reproduce it"} className="field resize-y" />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Sending…" : request ? "Submit request" : "Open ticket"}
        </Button>
        <p role="status" className={`text-sm ${state.error ? "text-danger" : "text-accent"}`}>
          {state.error ?? (state.ok ? (request ? "Request sent. We'll reply here with a plan and estimate." : "Ticket opened. We'll reply here.") : "")}
        </p>
      </div>
    </form>
  );
}
