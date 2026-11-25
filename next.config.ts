import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"], remotePatterns: [{ protocol: "https", hostname: "images.pexels.com" }] },
  // inlineCss: no render-blocking stylesheet request (Tailwind output is small).
  experimental: {
    optimizePackageImports: ["lucide-react"],
    inlineCss: true,
    serverActions: { bodySizeLimit: "25mb" }, // admin media uploads (bucket caps each file at 10 MB)
  },
  // The four placeholder case studies were removed; send old links (and search results) to the work page.
  async redirects() {
    return ["case-1", "case-2", "case-3", "case-4"].map((slug) => ({ source: `/work/${slug}`, destination: "/work", permanent: true }));
  },
  async headers() {
    return [
      {
        source: "/media/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
