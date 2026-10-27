import Image from "next/image";
import white from "@/public/brand/gravityy-mark-white.png";

/** Logo mark. The site is dark only, so just the white mark is loaded. */
export default function BrandMark({ height = 24, priority }: { height?: number; priority?: boolean }) {
  const width = Math.round((height * 472) / 320);
  return <Image src={white} alt="" width={width} height={height} priority={priority} className="w-auto" style={{ height }} />;
}
