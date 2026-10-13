import { ImageResponse } from "next/og";

export const alt = "Gravityy Studio — We design. We build. We automate.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(circle at 85% 20%, rgba(168,240,30,0.22), #0A0A0A 55%)",
          color: "#F5F5F2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: -0.5, opacity: 0.8 }}>Gravityy Studio</div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 108, fontWeight: 600, lineHeight: 0.95, letterSpacing: -4 }}>
          <span>WE DESIGN.</span>
          <span>WE BUILD.</span>
          <span style={{ color: "#A8F01E" }}>WE AUTOMATE.</span>
        </div>
      </div>
    ),
    size,
  );
}
