import React, { useState } from "react";
import { createOperatorBundleCheckout } from "../../lib/api.js";
import { operatorBundleProduct } from "../../data/operatorBundle.js";

export function OperatorBundleCheckoutButton({ authSession, authReady, compact = false }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleCheckout() {
    if (!authSession?.access_token) {
      window.location.href = "/members";
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const data = await createOperatorBundleCheckout(authSession.access_token);
      window.location.href = data.url;
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not open the Operator Bundle checkout.");
    }
  }

  return (
    <div className={`checkout-box ${compact ? "compact" : ""}`}>
      <button type="button" onClick={handleCheckout} disabled={!authReady || status === "loading"}>
        {authSession
          ? status === "loading"
            ? "Opening Stripe..."
            : `Unlock for ${operatorBundleProduct.priceLabel}`
          : "Create profile to unlock"}
      </button>
      {message && <p className="form-message error">{message}</p>}
    </div>
  );
}
