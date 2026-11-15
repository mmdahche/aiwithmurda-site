import { museKit } from "./museKit.js";

// The public site is one sales page plus Terms and Privacy. Retired paths are redirected to / by the server.
export const publicPageMetadata = {
  "/": {
    title: `${museKit.name} | AI with Murda`,
    description: `A setup kit for Meta's Muse assistant, for Facebook Marketplace sellers. Muse writes your listings and replies, and you approve listings, prices and pickup times. ${museKit.price}, one time.`,
  },
  "/terms": { title: "Terms of Service | AI with Murda", description: "Purchase, license, and service terms for AI with Murda." },
  "/privacy": { title: "Privacy Policy | AI with Murda", description: "How AI with Murda handles account, payment, and connected-service information." },
};

export function metadataForPath(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin" || path.startsWith("/obs") || path.startsWith("/overlay")) return { title: "AI with Murda", description: "Account-protected tools and broadcast resources.", noindex: true, path };
  return publicPageMetadata[path] ? { ...publicPageMetadata[path], path } : { ...publicPageMetadata["/"], path: "/" };
}
