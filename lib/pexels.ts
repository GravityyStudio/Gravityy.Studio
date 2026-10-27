// Stock media from Pexels (free to use under the Pexels license; credited in the footer). Served from Pexels' CDN:
// images go through next/image (remotePatterns in next.config.ts), videos stream directly. Only illustrative
// topics — never presented as our team, clients or project results.

type Photo = { id: number; alt: string };
const photo = (id: number, alt: string): Photo => ({ id, alt });
export const pexelsImage = (p: Photo) => `https://images.pexels.com/photos/${p.id}/pexels-photo-${p.id}.jpeg`;

/** One photo per service (CMS service id). */
export const SERVICE_PHOTOS: Record<string, Photo> = {
  brand: photo(7661590, "Sheets of paper mapping out branding, identity and marketing ideas"),
  uiux: photo(196644, "Notebook of wireframe sketches beside a smartphone on a wooden desk"),
  web: photo(6424590, "Laptop screen showing code under blue light"),
  app: photo(27141316, "Dashboard interface with graphs glowing in low light"),
  mobile: photo(270283, "Smartphone home screen full of app icons"),
  ecom: photo(4440887, "Delivery boxes waiting at a front door"),
  auto: photo(18471543, "Close-up of an automated assembly machine"),
  crm: photo(17323801, "Network rack with blue-lit cabling"),
  cloud: photo(37730212, "Server racks in a data centre"),
  seo: photo(3912976, "Search and traffic graph on a laptop screen"),
  data: photo(10020092, "Tablet showing a web analytics dashboard"),
};

/** Background loops (desktop only, see BgVideo). */
export const VIDEOS = {
  hero: "https://videos.pexels.com/video-files/34567729/14646021_1280_720_30fps.mp4", // purple particle waves
  services: "https://videos.pexels.com/video-files/30345895/13007248_1280_720_30fps.mp4", // LED circuit
};
