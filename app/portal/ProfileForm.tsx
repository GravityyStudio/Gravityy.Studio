"use client";
import { useActionState } from "react";
import { updateProfile, type ProfileState } from "./actions";
import Button from "@/components/ui/Button";

export default function ProfileForm({ fullName, region }: { fullName: string; region: "IN" | "GLOBAL" }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Full name
        <input name="full_name" defaultValue={fullName} autoComplete="name" className="field" />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Billing region
        <select name="region" defaultValue={region} className="field">
          <option value="IN">India · INR + GST (Razorpay)</option>
          <option value="GLOBAL">International · USD (Stripe)</option>
        </select>
      </label>
      <p role="status" className={`min-h-5 text-sm ${state.error ? "text-danger" : "text-accent"}`}>
        {state.error ?? (state.ok ? "Saved." : "")}
      </p>
      <Button type="submit" variant="ghost" disabled={pending} className="sm:self-start">
        Save profile
      </Button>
    </form>
  );
}
