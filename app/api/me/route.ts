import { getViewer } from "@/lib/auth";

// Who is signed in, for the site nav (pages are static, so the nav asks after load). Only what the nav shows:
// a first name for the avatar and where "Dashboard" goes. Never cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  const body = viewer
    ? {
        signedIn: true,
        name: viewer.profile.full_name?.split(" ")[0] || viewer.profile.email.split("@")[0],
        href: viewer.profile.role === "admin" ? "/admin" : "/portal",
      }
    : { signedIn: false };
  return Response.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
