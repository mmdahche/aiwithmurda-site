import React, { useEffect, useState } from "react";
import { ArrowRight, CircleAlert } from "lucide-react";
import { createFutureMethodCheckout, createOperatorBundleCheckout, createOperatorToolkitCheckout, getMemberProfile } from "../../lib/api.js";

const checkoutFor = {
  "future-proof-method": createFutureMethodCheckout,
  "operator-bundle": createOperatorBundleCheckout,
  "operator-toolkit": createOperatorToolkitCheckout,
};

export function PurchaseAction({ offer, authSession, authReady }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [owned, setOwned] = useState(null);
  const [accessError, setAccessError] = useState(false);
  const [accessAttempt, setAccessAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setOwned(null); setAccessError(false);
    if (!authSession?.access_token) return undefined;
    getMemberProfile(authSession.access_token).then((data) => {
      if (!active) return;
      const keys = new Set((data.entitlements || []).filter((item) => item.status === "active").map((item) => item.product_key));
      const includes = offer.slug === "future-proof-method" ? [offer.key, "new_wave_live_builds", "operator_toolkit", "sku_arsenal"] : offer.slug === "operator-bundle" ? [offer.key, "operator_toolkit", "sku_arsenal"] : [offer.key, "sku_arsenal"];
      setOwned(includes.some((key) => keys.has(key)));
    }).catch(() => { if (active) setAccessError(true); });
    return () => { active = false; };
  }, [authSession?.access_token, offer.slug, offer.key, accessAttempt]);
  async function buy() {
    if (!authSession?.access_token) return;
    setStatus("loading"); setError("");
    try {
      const result = await checkoutFor[offer.slug](authSession.access_token);
      if (!result.url) throw new Error("Checkout did not return a payment page. Please try again.");
      window.location.assign(result.url);
    } catch (failure) { setStatus("error"); setError(failure.message || "Checkout could not open. Please try again."); }
  }
  // Presentation only from here down: the states, their order and their wording are unchanged.
  const arrow = <ArrowRight className="mx-i" aria-hidden="true" />;
  const busy = !authReady || owned === null || status === "loading";
  if (authReady && !authSession) return <a className="mx-btn mx-btn--lg mx-btn--block sf-button" href={`/members?next=store-${offer.slug}`}>Sign in to buy {arrow}</a>;
  if (owned) return <a className="mx-btn mx-btn--lg mx-btn--block sf-button" href="/members">Already yours · Open downloads {arrow}</a>;
  if (accessError) return <div className="mx-purchase">
    <p role="alert" className="mx-purchase-alert"><CircleAlert className="mx-i" aria-hidden="true" /><span>We couldn't check your existing purchases. Please retry before buying.</span></p>
    <button type="button" className="mx-btn mx-btn--lg mx-btn--block" onClick={() => setAccessAttempt((value) => value + 1)}>Retry account check</button>
  </div>;
  return <div className="mx-purchase sf-purchase-action">
    <button type="button" className="mx-btn mx-btn--lg mx-btn--block" disabled={busy} onClick={buy}>{!authReady || owned === null ? "Checking account..." : status === "loading" ? "Opening checkout..." : `Continue to checkout · ${offer.dueToday ? `$${offer.dueToday}` : offer.price}`}{arrow}</button>
    {error && <p role="alert" className="mx-purchase-alert"><CircleAlert className="mx-i" aria-hidden="true" /><span>{error}</span></p>}
  </div>;
}
