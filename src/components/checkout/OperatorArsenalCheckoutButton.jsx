import React, { useState } from "react";
import { createOperatorArsenalCheckout } from "../../lib/api.js";
import { operatorArsenalProduct } from "../../data/operatorArsenal.js";

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
    <div className={`checkout-box operator-arsenal-checkout ${compact ? "compact" : ""}`}>
      <button type="button" onClick={handleCheckout} disabled={!authReady || status === "loading"}>
        {authSession ? (status === "loading" ? "Opening Stripe..." : "Pay $497 and activate") : "Create profile to continue"}
      </button>
      {!compact && <small>{operatorArsenalProduct.checkoutLabel}</small>}
      {message && <p className="form-message error">{message}</p>}
    </div>
  );
}
