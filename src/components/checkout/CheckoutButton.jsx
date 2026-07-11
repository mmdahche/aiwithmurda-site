import React, { useState } from "react";
import { createFutureMethodCheckout } from "../../lib/api.js";

export function CheckoutButton({ authSession, authReady, label = "Buy for $47" }) {
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
      const data = await createFutureMethodCheckout(authSession.access_token);
      window.location.href = data.url;
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Checkout could not open. Wait a few seconds and try again.");
    }
  }

  return (
    <div className="checkout-box">
      <button type="button" onClick={handleCheckout} disabled={!authReady || status === "loading"}>
        {authSession ? (status === "loading" ? "Opening Stripe..." : label) : "Create profile to buy"}
      </button>
      {message && <p className="form-message error">{message}</p>}
    </div>
  );
}
