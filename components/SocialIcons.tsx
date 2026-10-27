import { Mail } from "lucide-react";
import { socialIcon } from "./ui/BrandIcons";

/** A social link is real only once it points at a profile: a bare domain or a {{PLACEHOLDER}} is left out. */
export const isProfile = (href: string) => {
  if (href.includes("{{")) return false;
  try {
    return new URL(href).pathname.replace(/\/+$/, "") !== "";
  } catch {
    return false;
  }
};

/** Round icon links for the studio's social profiles (CMS → Site → social) plus email. Icons carry the network name. */
export default function SocialIcons({ social, email, className = "" }: { social: { label: string; href: string }[]; email: string; className?: string }) {
  const links = social.filter((s) => isProfile(s.href));
  const cls = "grid h-11 w-11 place-items-center rounded-full text-fg/85 shadow-hairline transition-colors hover:bg-accent hover:text-on-accent";
  return (
    <ul aria-label="Follow and contact" className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((s) => {
        const Icon = socialIcon(s.label);
        return (
          <li key={s.label}>
            <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`} className={cls}>
              <Icon size={18} aria-hidden="true" />
            </a>
          </li>
        );
      })}
      <li>
        <a href={`mailto:${email}`} aria-label={`Email ${email}`} className={cls}>
          <Mail size={18} aria-hidden="true" />
        </a>
      </li>
    </ul>
  );
}
