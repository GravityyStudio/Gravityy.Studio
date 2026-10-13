"use client";
import { useEffect, useRef } from "react";
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, Filler, Legend, LinearScale, LineController, LineElement, PieController, PointElement, Tooltip,
} from "chart.js";
import { useContent } from "./ContentProvider";
import { MOTION, prefersReduced } from "@/lib/motion";
import { useTheme } from "@/hooks/useTheme";

/** Theme token → "rgb(r g b / a)" read from CSS variables, so charts follow dark/light mode. */
const token = (name: string, a = 1) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()} / ${a})`;

Chart.register(LineController, LineElement, PointElement, BarController, BarElement, PieController, ArcElement, CategoryScale, LinearScale, Filler, Legend, Tooltip);

/** Chart.js lives in its own chunk (dynamic import from Analytics), mounted once the section is in view. */
export default function Charts() {
  const { charts: data } = useContent();
  const line = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLCanvasElement>(null);
  const pie = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  // Re-created on theme change so every colour comes from the active palette.
  useEffect(() => {
    const [accent, fg, muted, grid, strong, raised] = [token("accent"), token("fg"), token("muted"), token("line"), token("line-strong"), token("raised")];
    Chart.defaults.color = muted;
    Chart.defaults.font = { family: getComputedStyle(document.body).fontFamily, size: 12 };
    const animation = prefersReduced() ? (false as const) : { duration: MOTION.dur.analytics * 1000 };
    const weeks = Array.from({ length: data.weeks }, (_, i) => "W" + (i + 1));
    const legend = { labels: { boxWidth: 10, boxHeight: 10 } };
    const charts = [
      new Chart(line.current!, {
        type: "line",
        data: {
          labels: weeks,
          datasets: [
            { label: "Sessions", data: data.sessions, borderColor: accent, backgroundColor: token("accent", 0.1), fill: true, tension: 0.35, pointRadius: 0, yAxisID: "y" },
            { label: "Leads", data: data.leads, borderColor: fg, tension: 0.35, pointRadius: 0, yAxisID: "y1" },
          ],
        },
        options: { animation, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend }, scales: { x: { grid: { display: false } }, y: { grid: { color: grid } }, y1: { position: "right", grid: { display: false } } } },
      }),
      new Chart(bar.current!, {
        type: "bar",
        data: { labels: data.channels.labels, datasets: [{ label: "Conversion %", data: data.channels.data, backgroundColor: data.channels.data.map((v) => (v === Math.max(...data.channels.data) ? accent : strong)), borderRadius: 6 }] },
        options: { animation, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: grid }, ticks: { callback: (v) => v + "%" } } } },
      }),
      new Chart(pie.current!, {
        type: "pie",
        data: { labels: data.sources.labels, datasets: [{ data: data.sources.data, backgroundColor: [accent, fg, muted, strong, grid], borderColor: raised, borderWidth: 2 }] },
        options: { animation, maintainAspectRatio: false, plugins: { legend: { ...legend, position: "right" } } },
      }),
    ];
    return () => charts.forEach((c) => c.destroy());
  }, [theme, data]);

  const fig = "rounded-2xl bg-raised p-5";
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <figure className={`${fig} md:col-span-2 xl:col-span-1`}>
        <figcaption className="mb-4 text-sm font-medium">Weekly sessions vs. leads</figcaption>
        <div className="relative h-60">
          <canvas ref={line} role="img" aria-label="Line chart: weekly sessions rising from about 2,600 to 5,400 and leads from 70 to 150 over 12 weeks" />
        </div>
      </figure>
      <figure className={fig}>
        <figcaption className="mb-4 text-sm font-medium">Conversion rate by channel</figcaption>
        <div className="relative h-60">
          <canvas ref={bar} role="img" aria-label="Bar chart: conversion rate by channel, email highest at 7.9 percent" />
        </div>
      </figure>
      <figure className={fig}>
        <figcaption className="mb-4 text-sm font-medium">Lead source</figcaption>
        <div className="relative h-60">
          <canvas ref={pie} role="img" aria-label="Pie chart of lead sources: organic search 38 percent, paid social 24, referral 16, email 12, direct 10" />
        </div>
      </figure>
    </div>
  );
}
