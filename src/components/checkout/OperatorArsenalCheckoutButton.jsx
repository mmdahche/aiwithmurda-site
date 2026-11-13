import React, { useState } from "react";
import { createOperatorArsenalCheckout } from "../../lib/api.js";
import { operatorArsenalProduct } from "../../data/operatorArsenal.js";

// Self-contained in the site system (styles: src/site/product.css, "mx-checkout"),
// so it reads the same on a storefront page and in the member area.
export function OperatorArsenalCheckoutButton({ authSession, authReady, compact = false }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleCheckout() {
    if (!authSession?.access_token) {
      window.location.href = "/members?next=operator-arsenal";
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const data = await createOperatorArsenalCheckout(authSession.access_token);
      window.location.href = data.url;
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not open the Operator Arsenal checkout.");
    }
  }

  return (
    <div className={`mx mx-checkout${compact ? " mx-checkout--compact" : ""}`}>
      <button type="button" className="mx-btn mx-btn--block" onClick={handleCheckout} disabled={!authReady || status === "loading"}>
        {authSession ? (status === "loading" ? "Opening Stripe..." : "Pay $497 and activate") : "Create profile to continue"}
      </button>
      {!compact && <small className="mx-checkout-note">{operatorArsenalProduct.checkoutLabel}</small>}
      {message && <p className="mx-checkout-error" role="alert">{message}</p>}
    </div>
  );
}
