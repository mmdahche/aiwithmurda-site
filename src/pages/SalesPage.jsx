import React from "react";
import { ArrowRight, Check, Minus, Plus, X } from "lucide-react";
import { automationText, checkoutHref, checkoutIsPlaceholder, faq, headlinePhrases, kitPieces, museKit, painLine, sellerKeeps, setups } from "../data/museKit.js";

/*
  The one sales page (Murad's brief, Nov 15). Sections in the brief's order:
  1 headline, video, button / 2 problem / 3 who it's for / 4 what you get / 5 how it works /
  6 which setup / 7 story (shown once museKit.story is set) / 8 proof (left out until there are
  real results) / 9 price / 10 refunds (shown once museKit.refundTerms is set) / 11 questions /
  12 footer (in SiteShell). No placeholders on the live page.
  One strong colour: the buy button. Everything else stays neutral.
*/

export function BuyButton({ size = "lg", label = museKit.priceCents === 0 ? "Get the free kit" : `Get the kit for ${museKit.price}`, className = "" }) {
  return (
    <a
      className={`mx-btn ${size === "lg" ? "mx-btn--lg" : "mx-btn--sm"} sp-buy ${className}`}
      href={checkoutHref}
      data-checkout-link
      data-placeholder={checkoutIsPlaceholder ? "checkout-link" : undefined}
    >
      {label}
      <ArrowRight className="mx-i" aria-hidden="true" />
    </a>
  );
}

// The hero's 16:9 spot: the unlisted YouTube video once it exists, the kit image until then.
function HeroMedia() {
  if (museKit.salesVideoYouTubeId) {
    return (
      <div className="sp-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${museKit.salesVideoYouTubeId}?rel=0`}
          title={`${museKit.name}: sales video`}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  return <KitImage className="sp-video sp-video--image" priority />;
}

function KitImage({ className = "", priority = false }) {
  return (
    <figure className={className}>
      <img
        src="/images/muse-control-kit.png"
        alt={`${museKit.name}: a mockup of the kit`}
        width="1600"
        height="900"
        fetchPriority={priority ? "high" : undefined}
      />
    </figure>
  );
}

function Section({ id, title, children, className = "" }) {
  return (
    <section className={`sp-section ${className}`} id={id} aria-labelledby={`${id}-title`}>
      <div className="sp-col">
        <h2 className="mx-display sp-h2" id={`${id}-title`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function SalesPage() {
  return (
    <main className="mx mx-page sp" id="main-content">
      {/* 1. Above the fold: the result, the video, the button. */}
      <section className="sp-hero" aria-labelledby="sp-title">
        <div className="sp-col">
          <p className="sp-kicker">A Muse setup kit for Facebook Marketplace sellers</p>
          {/* Noor's brief, Nov 15: the headline is exact, do not reword it. The pain line goes right under it. */}
          <h1 className="mx-display sp-h1" id="sp-title">
            {headlinePhrases.map((phrase, index) => <React.Fragment key={phrase}>{index > 0 && " "}<span className="sp-h1-phrase">{phrase}</span></React.Fragment>)}
          </h1>
          <p className="sp-lede">{painLine}</p>
          <HeroMedia />
          <div className="sp-buy-row">
            <BuyButton />
            <p className="sp-buy-meta">{museKit.billing ? `${museKit.price}. ${museKit.billing}. Checkout on Whop.` : `${museKit.price}. You get it through Whop.`}</p>
          </div>
        </div>
      </section>

      {/* 2. The problem. */}
      <Section id="problem" title="Listing takes time. So items sit.">
        <p className="sp-text">
          Every item needs a write-up and a price. Then the same buyer questions come in, again and again. It all takes time, so items sit unposted.
        </p>
        {/* The automation, named, with what stays with the seller right next to it. Only the Automatic setup answers buyers by itself. */}
        <div className="sp-split">
          <div className="sp-split-part">
            <h3 className="sp-h3">What it automates</h3>
            <p>{automationText}</p>
          </div>
          <div className="sp-split-part">
            <h3 className="sp-h3">What stays with you</h3>
            <ul className="sp-keep">
              {sellerKeeps.map((item) => <li key={item}><Check className="mx-i" aria-hidden="true" /><span>{item}</span></li>)}
            </ul>
          </div>
        </div>
      </Section>

      {/* 3. Who it's for, and who it's not for. */}
      <Section id="fit" title="Who it's for">
        <ul className="sp-list" aria-label="This kit is for you if">
          <li><Check className="mx-i" aria-hidden="true" /><span>You sell used or collectible items on Facebook Marketplace.</span></li>
          <li><Check className="mx-i" aria-hidden="true" /><span>You run a shop, or you list often enough that it eats your time.</span></li>
          <li><Check className="mx-i" aria-hidden="true" /><span>You want help with listings and buyer replies, and the final say on listings, prices and pickup times.</span></li>
        </ul>
        <h3 className="sp-h3">Who it's not for</h3>
        <ul className="sp-list sp-list--not" aria-label="This kit is not for you if">
          <li><X className="mx-i" aria-hidden="true" /><span>You want listings and prices to go out without your yes.</span></li>
          <li><X className="mx-i" aria-hidden="true" /><span>You want a promise of sales or income.</span></li>
          <li><X className="mx-i" aria-hidden="true" /><span>You don't sell on Facebook Marketplace.</span></li>
        </ul>
      </Section>

      {/* 4. What you get. */}
      <Section id="kit" title="What you get">
        {/* The kit image sits in the hero until the video exists; then it moves here. */}
        {museKit.salesVideoYouTubeId && <KitImage className="sp-product" />}
        <ol className="sp-pieces">
          {kitPieces.map((piece) => (
            <li key={piece.name}>
              <span className="sp-piece">
                <span className="sp-piece-name">{piece.name}</span>
                <span className="sp-piece-detail">{piece.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {/* 5. How it works. */}
      <Section id="how" title="How it works">
        <ol className="sp-steps">
          <li><span className="sp-step-n" aria-hidden="true">1</span><div><h3 className="sp-h3">Pick your setup</h3><p>Ask me first, or Automatic. Paste that one into Muse.</p></div></li>
          <li><span className="sp-step-n" aria-hidden="true">2</span><div><h3 className="sp-h3">Send Muse photos</h3><p>Take photos of the item you want to sell and send them to Muse.</p></div></li>
          <li><span className="sp-step-n" aria-hidden="true">3</span><div><h3 className="sp-h3">Answer its questions</h3><p>Muse asks you questions about the item.</p></div></li>
          <li><span className="sp-step-n" aria-hidden="true">4</span><div><h3 className="sp-h3">Say yes</h3><p>Muse writes the listing for your yes, then helps you answer buyers the way your setup says.</p></div></li>
        </ol>
      </Section>

      {/* 6. Which setup is for you. Murad's wording, word for word. */}
      <Section id="setups" title="Which setup is for you">
        <p className="sp-text">The kit has two setups. You paste only one.</p>
        <div className="sp-setups">
          {setups.map((setup) => (
            <article className="sp-setup" key={setup.key} aria-labelledby={`setup-${setup.key}`}>
              <h3 className="sp-h3" id={`setup-${setup.key}`}>{setup.name}</h3>
              <p>{setup.text}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* 7. My story: only once Murad sends the text (museKit.story). */}
      {museKit.story && (
        <Section id="story" title="My story">
          <p className="sp-text">{museKit.story}</p>
        </Section>
      )}

      {/* 8. Proof: left out on purpose until there are real results. */}

      {/* 9. The price. */}
      <section className="sp-section sp-price" id="price" aria-labelledby="price-title">
        <div className="sp-col">
          <div className="sp-price-card">
            <h2 className="sp-price-name" id="price-title">{museKit.name}</h2>
            <p className="sp-price-amount"><span className="mx-display">{museKit.price}</span>{museKit.billing && <span className="sp-price-billing">{museKit.billing}</span>}</p>
            <p className="sp-price-detail">Muse writes the listings. You approve listings, prices and pickup times.</p>
            <BuyButton className="mx-btn--block" />
          </div>
        </div>
      </section>

      {/* 10. Guarantee or refund: only once Murad decides (museKit.refundTerms). */}
      {museKit.refundTerms && (
        <Section id="refunds" title="Refunds">
          <p className="sp-text">{museKit.refundTerms}</p>
        </Section>
      )}

      {/* 11. Questions and answers, closed by default. */}
      <Section id="faq" title="Questions">
        <div className="sp-faq">
          {faq.map((item) => (
            <details key={item.q}>
              <summary>
                <span>{item.q}</span>
                <Plus className="mx-i sp-faq-open" aria-hidden="true" />
                <Minus className="mx-i sp-faq-close" aria-hidden="true" />
              </summary>
              <div className="sp-faq-a">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
        <div className="sp-buy-row sp-buy-row--end">
          <BuyButton />
        </div>
      </Section>
    </main>
  );
}
