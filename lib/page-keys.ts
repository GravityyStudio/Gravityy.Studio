/** Marketing pages editable under Site CMS → Pages (keys of the `pages` CMS entry). */
export const PAGE_KEYS = ["home", "services", "solutions", "work", "process", "pricing", "faq", "blog", "contact"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];
