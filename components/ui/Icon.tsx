import {
  Activity, AppWindow, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Brush, ChartColumn, ChartLine, ChartPie, CircleCheck,
  Cloud, Code, Compass, CreditCard, Filter, Globe, Hand, LayoutDashboard, Mail, Megaphone, MousePointerClick, Network,
  NotebookPen, Palette, PencilRuler, PenTool, RefreshCw, Rocket, Search, Server, Settings2, ShoppingCart, Smartphone,
  Sparkles, Store, TrendingUp, Zap, type LucideIcon,
} from "lucide-react";

// Prototype used Material Symbols names; data keeps those names, mapped here to tree-shaken SVG icons.
const MAP: Record<string, LucideIcon> = {
  palette: Palette, design_services: PenTool, language: Globe, dashboard: LayoutDashboard, smartphone: Smartphone,
  shopping_cart: ShoppingCart, bolt: Zap, hub: Network, cloud: Cloud, travel_explore: Compass, monitoring: ChartLine,
  rocket_launch: Rocket, trending_up: TrendingUp, sync_alt: ArrowLeftRight, storefront: Store, insights: Sparkles,
  search: Search, edit_note: NotebookPen, draw: PencilRuler, code: Code, settings_suggest: Settings2, query_stats: Activity,
  brush: Brush, web: AppWindow, dns: Server, analytics: ChartPie, campaign: Megaphone, ads_click: MousePointerClick,
  mail: Mail, filter_alt: Filter, payments: CreditCard, waving_hand: Hand, autorenew: RefreshCw, check_circle: CircleCheck,
  arrow_outward: ArrowUpRight, arrow_back: ArrowLeft, arrow_forward: ArrowRight, chart: ChartColumn,
};

export default function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const C = MAP[name] ?? Sparkles;
  return <C aria-hidden="true" size={size} strokeWidth={1.5} className={className} />;
}
