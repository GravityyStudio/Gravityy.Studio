import Image from "next/image";
import white from "@/public/brand/gravityy-mark-white.png";
import black from "@/public/brand/gravityy-mark-black.png";

/** Logo mark that follows the theme (pure CSS swap, no hydration flash). Inside `.theme-dark` it stays white. */
export default function BrandMark({ height = 24, priority }: { height?: number; priority?: boolean }) {
  const width = Math.round((height * 472) / 320);
  return (
    <>
      <Image src={white} alt="" width={width} height={height} priority={priority} className="brand-white w-auto" style={{ height }} />
      <Image src={black} alt="" width={width} height={height} priority={priority} className="brand-black hidden w-auto" style={{ height }} />
    </>
  );
}
