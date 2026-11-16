/*
  Facebook Marketplace Muse Control Kit: the first tool on aiwithmurda.com (/tools/musekit).

  Copy, price, checkout link and kit contents live here, in one file. Nothing on the live page is a
  placeholder: the video, story and refund sections appear once their values are set below.

  Copy rules (from Murad's brief): no income or sales promises; never "guaranteed",
  "proven", "battle-tested", "verified", "fully automated", "hands-free", "on autopilot",
  "set it and forget it", "draft-only" or "you hit send yourself"; never say or hint that
  buyers won't know it's AI; no countdowns, scarcity, "Most Popular", value totals or
  bonuses; no em dashes; short plain sentences; no facts about Murad that he did not write.
  Only the Automatic setup answers buyers by itself; never write that Ask me first does.

  Plain ESM only: scripts/postbuild.mjs imports this through siteMetadata.js.
*/

export const museKit = {
  name: "Facebook Marketplace Muse Control Kit",
  shortName: "Muse Control Kit",
  price: "$27",
  priceCents: 2700,
  billing: "One time",

  // The Whop checkout for the kit ($27, one time). Every buy button on the site uses this one value.
  checkoutUrl: "https://whop.com/checkout/plan_u1TnTYybKdPk7/",
  // The kit's Whop product page (not linked from the site today).
  whopProductUrl: "https://whop.com/aiwithmurda/facebook-marketplace-muse-control-kit/",

  // The 11-character ID of the unlisted YouTube sales video (the part after "v="). There is no video yet:
  // while this is null the hero shows the 16:9 kit image in the video spot.
  salesVideoYouTubeId: null,

  // Murad's story and his refund terms. Each section stays off the page until its text is set here.
  story: null,
  refundTerms: null,
};

// The message (Noor's brief, Nov 15), word for word. Lead with posting, then name the automation.
// Rendered phrase by phrase so a line never breaks inside "a few photos" or "and a yes.".
export const headlinePhrases = ["This kit makes it", "a few photos", "and a yes."];
export const headline = headlinePhrases.join(" ");
export const painLine = "Posting is the hard part of selling on Marketplace.";
export const automationText = "It automates the busywork. On the automatic setup, once Muse knows an item, it answers the questions buyers ask most by itself. Offers and pickup times come to you ready to answer.";
export const sellerKeeps = ["Every listing", "Every agreed price", "Every pickup time"];

export const checkoutHref = museKit.checkoutUrl || "#placeholder-checkout-link";
export const checkoutIsPlaceholder = !museKit.checkoutUrl;

// Section 6. Murad's wording, word for word.
export const setups = [
  {
    key: "ask-first",
    name: "Ask me first",
    text: "Muse writes your listings and drafts every reply to buyers. Nothing goes out until you say yes. Best if you're new to Muse.",
  },
  {
    key: "automatic",
    name: "Automatic",
    text: "You still approve every listing and its price. Once you've answered Muse's questions about an item, Muse answers buyers about that item by itself. Every price you agree to waits for your yes, and when a buyer asks to come by, Muse asks you which day and time work before it tells them.",
  },
];

// Section 4. The real contents of the kit, from Murad via Noor (go-live update, Nov 15).
export const kitPieces = [
  { name: "The Facebook Marketplace Muse Control Kit ebook", detail: "One PDF, about 34 pages." },
  { name: "Prompt 1 - Ask me first", detail: "A plain-text setup prompt." },
  { name: "Prompt 2 - Automatic", detail: "A plain-text setup prompt." },
];

// Section 11. Answers from Murad via Noor (go-live update, Nov 15). Closed by default on the page.
export const faq = [
  {
    q: "Do I need Muse?",
    a: "Yes. You also need a Facebook account that can sell on Marketplace.",
  },
  {
    q: "Will Muse post or message buyers without my approval?",
    a: "Muse never posts a listing or agrees to a price or pickup time without your yes. On Ask me first, every reply waits for you. On Automatic, Muse answers common buyer questions by itself once it knows an item.",
  },
  {
    q: "Which setup should I pick?",
    a: "New to Muse? Pick Ask me first. Want fewer replies to handle? Pick Automatic. You paste only one.",
  },
  {
    q: "Does this guarantee sales?",
    a: "No. The kit helps you list items and answer buyers. It can't promise that anything sells, or sells for a certain price.",
  },
  {
    q: "Is this made by Meta or Facebook?",
    a: "No. The kit isn't made by or connected to Meta or Facebook.",
  },
  {
    q: "What if Muse looks different on my phone?",
    a: "Muse's screens can differ by phone and country, so yours may not match every step exactly.",
  },
];

export const footerNotes = [
  "The kit doesn't guarantee sales.",
  "Muse's screens can differ by phone and country.",
  "This kit isn't made by or connected to Meta or Facebook.",
];
