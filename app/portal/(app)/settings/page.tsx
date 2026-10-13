import { requireUser } from "@/lib/auth";
import ProfileForm from "../../ProfileForm";
import { portalRegion } from "../../region";

export const metadata = { title: "Settings" };

export default async function PortalSettings() {
  const { profile } = await requireUser("/portal/settings");
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section aria-labelledby="profile-h" className="card h-fit p-6 sm:p-8">
        <h2 id="profile-h" className="mb-5 text-2xl font-medium tracking-[-0.03em]">
          Profile
        </h2>
        <ProfileForm fullName={profile.full_name} region={await portalRegion(profile.region)} />
      </section>
      <section aria-labelledby="account-h" className="card h-fit p-6 sm:p-8">
        <h2 id="account-h" className="mb-5 text-2xl font-medium tracking-[-0.03em]">
          Account
        </h2>
        <dl className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="truncate">{profile.email}</dd>
          <dt className="text-muted">Account type</dt>
          <dd className="capitalize">{profile.role}</dd>
          {profile.created_at && (
            <>
              <dt className="text-muted">Member since</dt>
              <dd>{new Date(profile.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}</dd>
            </>
          )}
        </dl>
        <p className="mt-6 text-[13px] leading-relaxed text-muted">To change your email or delete your account, write to hello@gravityystudio.com.</p>
      </section>
    </div>
  );
}
