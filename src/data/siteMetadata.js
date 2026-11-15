import { museKit } from "./museKit.js";

// Head metadata for every public page. scripts/postbuild.mjs prerenders a head for each key (except "/",
// which is index.html itself) and writes the sitemap from these keys. Retired paths are redirected by the server.
// Plain ESM only: postbuild imports this file.
export const siteShareImage = { image: "/og-card.png", imageAlt: "AI with Murda: practical AI tools and setup kits from Murad." };
export const kitShareImage = { image: "/og-muse-kit.png", imageAlt: `${museKit.name}, a setup kit for Meta's Muse assistant.` };

export const publicPageMetadata = {
  "/": {
    title: "AI with Murda | Practical AI Tools",
    description: "Practical AI tools and setup kits from Murad, a business owner who builds with AI. Start with the Muse Control Kit for Facebook Marketplace sellers.",
    ...siteShareImage,
  },
  "/tools": {
    title: "Tools | AI with Murda",
    description: "Every AI with Murda tool in one place. Start with the Muse Control Kit for Facebook Marketplace sellers.",
    ...siteShareImage,
  },
  "/tools/musekit": {
    title: `${museKit.name} | AI with Murda`,
    description: `A setup kit for Meta's Muse assistant, for Facebook Marketplace sellers. Muse writes your listings and replies, and you approve listings, prices and pickup times. ${museKit.price}, one time.`,
    ...kitShareImage,
  },
  "/about": {
    title: "Meet Murad | AI with Murda",
    description: "From running a retail business to building inventory and point-of-sale software with AI. Meet the person behind the tools.",
    ...siteShareImage,
  },
  "/terms": { title: "Terms of Service | AI with Murda", description: "Purchase, license, and service terms for AI with Murda.", ...siteShareImage },
  "/privacy": { title: "Privacy Policy | AI with Murda", description: "How AI with Murda handles account, payment, and connected-service information.", ...siteShareImage },
};

export function metadataForPath(pathname) {
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (path === "/admin" || path.startsWith("/obs") || path.startsWith("/overlay")) return { title: "AI with Murda", description: "Account-protected tools and broadcast resources.", noindex: true, path, ...siteShareImage };
  return publicPageMetadata[path] ? { ...publicPageMetadata[path], path } : { ...publicPageMetadata["/"], path: "/" };
}
