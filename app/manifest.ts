import type { MetadataRoute } from "next";
import { DESC } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gravityy Studio",
    short_name: "Gravityy",
    description: DESC,
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    icons: [{ src: "/icon.png", sizes: "any", type: "image/png" }],
  };
}
