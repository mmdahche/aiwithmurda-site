import { museKit } from "./museKit.js";

/*
  Every tool on aiwithmurda.com, in shelf order. The first one is featured on the home page.
  The home shelf, the featured panel, the /tools grid, the footer and the sitemap read this list.
  Adding a product = add one object here (and its page, route and metadata).

  Plain ESM only: scripts/postbuild.mjs imports this through siteMetadata.js.
*/
export const tools = [
  {
    slug: "musekit",
    href: "/tools/musekit",
    name: museKit.name,
    shortName: museKit.shortName,
    audience: "For Facebook Marketplace sellers",
    summary: "A setup kit for Meta's Muse assistant. Muse writes your listings and replies, and you approve listings, prices and pickup times.",
    price: museKit.price,
    billing: museKit.billing,
    cta: "See the kit", // the link label on the /tools card and the home featured panel
    image: "/images/muse-control-kit.png",
    imageAlt: `${museKit.name}: a mockup of the kit`,
  },
];

export const featuredTool = tools[0];
