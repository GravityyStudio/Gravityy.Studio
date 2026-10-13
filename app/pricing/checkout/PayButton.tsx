"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import { startCheckout } from "./actions";

type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

/** Loads Razorpay Checkout only when needed (never on marketing pages). */
const loadRazorpay = () =>
  new Promise<RazorpayCtor>((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay failed to load")));
    s.onerror = () => reject(new Error("Couldn't reach Razorpay. Check your connection."));
    document.body.appendChild(s);
  });

export default function PayButton({ planId, label }: { planId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const pay = () =>
    start(async () => {
      setError("");
      const r = await startCheckout(planId);
      if (r.kind === "error") return setError(r.message);
      if (r.kind === "redirect") return void (window.location.href = r.url); // Stripe-hosted checkout
      try {
        const Razorpay = await loadRazorpay();
        const rzp = new Razorpay({
          key: r.keyId,
          order_id: r.orderId,
          amount: r.amount,
          currency: r.currency,
          name: "Gravityy Studio",
          description: r.name,
          prefill: { email: r.email },
          notes: { user_id: r.userId, plan_id: r.planId }, // copied onto the payment → webhook links it to the plan
          theme: { color: "#4D7C0F" },
          // The verified webhook writes the invoice; this only moves the user along.
          handler: () => router.push("/portal?paid=1"),
        });
        rzp.on("payment.failed", (resp) => setError(resp.error?.description ?? "Payment failed. Please try again."));
        rzp.open();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't start the payment.");
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <Button variant="accent" onClick={pay} disabled={pending} className="w-full">
        <Lock size={15} aria-hidden="true" />
        {pending ? "Starting secure checkout…" : label}
      </Button>
      <p role="status" className="min-h-5 text-sm text-danger">
        {error}
      </p>
    </div>
  );
}
