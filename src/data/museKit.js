/*
  Facebook Marketplace Muse Control Kit: the one product aiwithmurda.com sells.

  Everything Murad still has to supply is marked PLACEHOLDER here, in one file,
  so the sales page can be finished by editing this file only.

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

  // PLACEHOLDER: the Whop checkout link for the kit. Every buy button on the site uses this one value.
  // Until Murad sends the link it points at a page anchor and the button is labelled as a placeholder in development.
  checkoutUrl: null,

  // PLACEHOLDER: the 11-character ID of the unlisted YouTube sales video (the part after "v=").
  // While it is null the page shows a marked 16:9 placeholder in the video spot.
  salesVideoYouTubeId: null,
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

// Section 4. PLACEHOLDER: Murad confirms the exact list and adds one line on each piece.
// The five names come from his brief (Nov 15 update); nothing else about them is assumed.
export const kitPieces = ["The two setup prompts", "The \"Which setup is for you\" guide", "The setup steps", "The buyer reply guide", "The stop and safety sheet"];

// Section 11. `check: true` marks an answer Murad should confirm before launch.
export const faq = [
  {
    q: "Do I need Muse?",
    a: "Yes. The kit is a setup for Meta's Muse assistant, so you need access to Muse.",
    check: "Confirm where and how a seller gets Muse, and whether it works on every phone and in every country you sell to.",
  },
  {
    q: "Will Muse post or message buyers without my approval?",
    a: "The kit tells Muse to wait for your yes on every listing and price, in both setups. Replies depend on the setup. With Ask me first, Muse drafts every reply for your yes. With Automatic, Muse answers buyers about an item by itself once you've answered its questions about that item. It still waits for your yes on prices, and it asks you which day and time work before it tells a buyer.",
    check: "Confirm that Muse follows the setup this closely in testing, and whether you want a line telling sellers to watch Muse's first few replies.",
  },
  {
    q: "Which setup should I pick?",
    a: "Pick Ask me first if you're new to Muse. Pick Automatic if you want Muse to answer buyers by itself about items you have already told it about. You paste only one.",
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
    check: "Add what a seller should do if their screens don't match (for example, email you).",
  },
  {
    q: "How do I get the kit after I pay?",
    a: null,
    check: "PLACEHOLDER: how kit buyers receive the kit through Whop.",
  },
];

export const footerNotes = [
  "The kit doesn't guarantee sales.",
  "Muse's screens can differ by phone and country.",
  "This kit isn't made by or connected to Meta or Facebook.",
];
