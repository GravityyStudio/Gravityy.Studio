"use client";
import { useEffect, useState } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Honeypot from "./ui/Honeypot";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { useContent } from "./ContentProvider";

type Props = { open: boolean; prefill: string; onClose: () => void };

export default function ContactModal({ open, prefill, onClose }: Props) {
  const { site } = useContent();
  const [message, setMessage] = useState(prefill);
  const [sent, setSent] = useState<{ name: string; email: string } | null>(null);
  const { status, onSubmit, invalid } = useFormSubmit("/api/contact", "contactSchema", (d) => setSent({ name: d.name, email: d.email }));

  // Each open starts fresh with the latest prefill (configurator / pricing CTA).
  useEffect(() => {
    if (open) {
      setMessage(prefill);
      setSent(null);
    }
  }, [open, prefill]);

  const mailto = `mailto:${site.email}?subject=${encodeURIComponent("New project enquiry")}&body=${encodeURIComponent(message)}`;

  return (
    <Modal open={open} onClose={onClose} labelledBy="contact-h">
      <h2 id="contact-h" className="mb-6 pr-12 text-[28px] font-medium">
        Start a Project
      </h2>
      {sent ? (
        <p role="status" className="text-[17px] leading-relaxed">
          Thanks, {sent.name}. We&apos;ll reply to {sent.email} within one working day.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Honeypot />
          <label className="flex flex-col gap-2 text-sm font-medium">
            Name
            <input name="name" autoComplete="name" className="field" aria-invalid={invalid("name")} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <input type="email" name="email" autoComplete="email" className="field" aria-invalid={invalid("email")} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Project details
            <textarea
              name="message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What are you building, and by when?"
              className="field resize-y leading-relaxed"
              aria-invalid={invalid("message")}
            />
          </label>
          <p role="status" className={`min-h-5 text-sm ${status.ok ? "text-accent" : "text-danger"}`}>
            {status.msg}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" variant="accent" disabled={status.pending}>
              Send brief
            </Button>
            <a href={mailto} className="py-3 text-[15px] text-muted underline-offset-4 hover:text-fg hover:underline">
              or email us directly
            </a>
          </div>
        </form>
      )}
    </Modal>
  );
}
