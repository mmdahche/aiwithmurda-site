import React from "react";
import { ArrowRight, Check, Minus, Plus, Play, X } from "lucide-react";
import { checkoutHref, checkoutIsPlaceholder, faq, kitPieces, museKit, setups } from "../data/museKit.js";

/*
  The one sales page (Murad's brief, Nov 15). Sections in the brief's order:
  1 headline, video, button / 2 problem / 3 who it's for / 4 what you get / 5 how it works /
  6 which setup / 7 story / 8 proof (left out on purpose until there are real results) /
  9 price / 10 refunds / 11 questions / 12 footer (in SiteShell).
  One strong colour: the buy button. Everything else stays neutral.
*/

export function BuyButton({ size = "lg", label = `Get the kit for ${museKit.price}`, className = "" }) {
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

function Placeholder({ title, children }) {
  return (
    <div className="sp-placeholder" role="note">
      <p className="sp-placeholder-tag">Placeholder</p>
      <p className="sp-placeholder-title">{title}</p>
      {children && <p className="sp-placeholder-note">{children}</p>}
    </div>
  );
}

function CheckoutNote() {
  if (!checkoutIsPlaceholder) return null;
  return <p className="sp-placeholder-inline">Placeholder: the Whop checkout link goes here.</p>;
}

function SalesVideo() {
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
  return (
    <div className="sp-video sp-video--placeholder" role="note">
      <span className="sp-video-play" aria-hidden="true"><Play className="mx-i" /></span>
      <p className="sp-placeholder-tag">Placeholder</p>
      <p className="sp-placeholder-title">Sales video</p>
      <p className="sp-placeholder-note">Swap in the unlisted YouTube video.</p>
    </div>
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
          <p className="sp-kicker">For Facebook Marketplace sellers</p>
          <h1 className="mx-display sp-h1" id="sp-title">Muse writes the listing. <span>You say yes.</span></h1>
          <p className="sp-lede">
            A setup kit for Meta's Muse assistant. Send Muse photos of an item, answer its questions, and approve the listing it writes.
          </p>
          <SalesVideo />
          <div className="sp-buy-row">
            <BuyButton />
            <p className="sp-buy-meta">{museKit.price}. {museKit.billing}.</p>
            <CheckoutNote />
          </div>
        </div>
      </section>

      {/* 2. The problem. */}
      <Section id="problem" title="Listing takes time. So items sit.">
        <p className="sp-text">
          Every item needs a write-up and a price. Then the same buyer questions come in, again and again. It all takes time, so items sit unposted.
        </p>
      </Section>

      {/* 3. Who it's for, and who it's not for. */}
      <Section id="fit" title="Who it's for">
        <ul className="sp-list" aria-label="This kit is for you if">
          <li><Check className="mx-i" aria-hidden="true" /><span>You sell used or collectible items on Facebook Marketplace.</span></li>
          <li><Check className="mx-i" aria-hidden="true" /><span>You run a shop, or you list often enough that it eats your time.</span></li>
          <li><Check className="mx-i" aria-hidden="true" /><span>You want help with listings and buyer replies, and you want the final say.</span></li>
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
        <figure className="sp-product">
          <img
            src="/images/muse-control-kit.png"
            alt={`${museKit.name}: a mockup of the kit`}
            width="1600"
            height="900"
          />
        </figure>
        <ol className="sp-pieces">
          {kitPieces.map((piece) => <li key={piece}>{piece}</li>)}
        </ol>
        <Placeholder title="Confirm this list">
          Check the four pieces and add one short line on what each one does.
        </Placeholder>
      </Section>

      {/* 5. How it works. */}
      <Section id="how" title="How it works">
        <ol className="sp-steps">
          <li><span className="sp-step-n" aria-hidden="true">1</span><div><h3 className="sp-h3">Pick your setup</h3><p>Ask me first, or Automatic. Paste that one into Muse.</p></div></li>
          <li><span className="sp-step-n" aria-hidden="true">2</span><div><h3 className="sp-h3">Send Muse photos</h3><p>Take photos of the item you want to sell and send them to Muse.</p></div></li>
          <li><span className="sp-step-n" aria-hidden="true">3</span><div><h3 className="sp-h3">Answer its questions</h3><p>Muse asks you about the item before it writes anything.</p></div></li>
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

      {/* 7. My story. */}
      <Section id="story" title="My story">
        <Placeholder title="Murad's story">Murad is finishing this text and will send it.</Placeholder>
      </Section>

      {/* 8. Proof: left out on purpose until there are real results. */}

      {/* 9. The price. */}
      <section className="sp-section sp-price" id="price" aria-labelledby="price-title">
        <div className="sp-col">
          <div className="sp-price-card">
            <h2 className="sp-price-name" id="price-title">{museKit.name}</h2>
            <p className="sp-price-amount"><span className="mx-display">{museKit.price}</span><span className="sp-price-billing">{museKit.billing}</span></p>
            <p className="sp-price-detail">One kit. Two setups. You paste the one you want.</p>
            <BuyButton className="mx-btn--block" />
            <CheckoutNote />
          </div>
        </div>
      </section>

      {/* 10. Guarantee or refund. */}
      <Section id="refunds" title="Refunds">
        <Placeholder title="Refund or guarantee terms">This decision is Murad's. Add the terms here.</Placeholder>
      </Section>

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
                {item.a && <p>{item.a}</p>}
                {item.check && (
                  <p className="sp-placeholder-inline">{item.a ? "Check: " : ""}{item.check}</p>
                )}
              </div>
            </details>
          ))}
        </div>
        <div className="sp-buy-row sp-buy-row--end">
          <BuyButton />
          <CheckoutNote />
        </div>
      </Section>
    </main>
  );
}
