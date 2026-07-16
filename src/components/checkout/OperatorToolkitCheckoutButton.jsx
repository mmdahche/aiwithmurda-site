import React, { useState } from "react";
import { createOperatorToolkitCheckout } from "../../lib/api.js";

export function OperatorToolkitCheckoutButton({ authSession, authReady, compact = false }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleCheckout() {
    if (!authSession?.access_token) {
      window.location.href = "/members?next=operator-toolkit";
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const data = await createOperatorToolkitCheckout(authSession.access_token);
      window.location.href = data.url;
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not open the Operator Toolkit checkout.");
    }
  }

  return (
    <div className={`checkout-box operator-toolkit-checkout ${compact ? "compact" : ""}`}>
      <button type="button" onClick={handleCheckout} disabled={!authReady || status === "loading"}>
        {authSession ? (status === "loading" ? "Opening Stripe..." : "Pay $327 and activate") : "Create profile to continue"}
      </button>
      {!compact && (
        <small>$297 permanent setup + first $30 month. Then $30/month until canceled.</small>
      )}
      {message && <p className="form-message error">{message}</p>}
    </div>
  );
}
