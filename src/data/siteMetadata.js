import { storefrontOffers } from "./storefront.js";
import { storefrontShelf } from "./storefrontCatalog.js";

export const publicPageMetadata = {
  "/": { title: "AI with Murda | Scripts, Skills & Project Setups", description: "Meet Murad and explore the scripts, skills, and project setups he uses to build with Claude Code and Codex. Try the free starter pack." },
  "/store": { title: "The Tool Shop | AI with Murda", description: "Browse AI workflow packages, reusable scripts, skills, and setup folders. See the files and requirements before you buy." },
  "/about": { title: "Meet Murad | AI with Murda", description: "From running a retail business to building inventory and point-of-sale software with AI. Meet the person behind the tools." },
  "/start": { title: "Free Starter Pack | AI with Murda", description: "Download a free prompt script, verification skill, and daily checklist for your next AI-assisted project. No email required." },
  "/free/inbox-cleanup": { title: "Free Inbox Cleanup Kit, With or Without AI | AI with Murda", description: "Clean inbox clutter with a guided local menu or AI-assisted sender review. Includes a practice inbox, Mac/Windows setup and previews. Gmail and iCloud." },
  "/60": { title: "Build Log Archive | AI with Murda", description: "The original AI with Murda build-in-public challenge, daily records, and project history." },
  "/live": { title: "Streams & Replays | AI with Murda", description: "AI with Murda stream links, replays, and build notes." },
  "/tools": { title: "Build Resources | AI with Murda", description: "Resources and tools from the AI with Murda build log." },
  "/operator-arsenal": { title: "Operator Arsenal | AI with Murda", description: "Explore the complete folder library and Toolkit. Review contents, requirements, and recurring update charges before checkout." },
  "/terms": { title: "Terms of Service | AI with Murda", description: "Purchase, license, and service terms for AI with Murda." },
  "/privacy": { title: "Privacy Policy | AI with Murda", description: "How AI with Murda handles account, payment, and connected-service information." },
  ...Object.fromEntries(storefrontOffers.flatMap((offer) => [
    [`/store/${offer.slug}`, { title: `${offer.name} | AI with Murda`, description: offer.description }],
    [offer.legacyHref, { title: `${offer.name} | AI with Murda`, description: offer.description }],
  ])),
  ...Object.fromEntries(storefrontShelf.map((product) => [`/store/${product.key}`, { title: `${product.name} | AI with Murda`, description: product.description }])),
};

export function metadataForPath(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/members" || path.startsWith("/members/")) return { title: "My Downloads | AI with Murda", description: "Sign in for your purchased files, setup guides, and lessons.", noindex: true, path };
  if (path === "/admin" || path.startsWith("/obs") || path.startsWith("/overlay")) return { title: "AI with Murda", description: "Account-protected tools and broadcast resources.", noindex: true, path };
  if (/^\/day\/\d+$/.test(path)) return { title: `Day ${path.split("/").pop()} | AI with Murda Build Log`, description: "A daily record from the original AI with Murda build-in-public challenge.", path };
  return publicPageMetadata[path] ? { ...publicPageMetadata[path], path } : { title: "Page Not Found | AI with Murda", description: "Find your way back to the AI with Murda tool shop.", noindex: true, path };
}
