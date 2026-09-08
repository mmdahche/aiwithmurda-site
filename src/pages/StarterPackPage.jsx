import React, { useState } from "react";
import { ArrowRight, Check, Download } from "lucide-react";
import { subscribeBuildLog } from "../lib/api.js";
import { FolderPreview } from "../components/storefront/StorefrontParts.jsx";

export function StarterPackPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  async function subscribe(event) {
    event.preventDefault(); setStatus("loading"); setMessage("");
    try { await subscribeBuildLog({ email, name, source: "storefront_starter_pack" }); setStatus("success"); setMessage("You're subscribed. Check your inbox for the welcome email."); }
    catch { setStatus("error"); setMessage("We couldn't subscribe you just now. Try again; your free download is still available above."); }
  }
  return <main className="sf-page" id="main-content"><section className="sf-container sf-starter-heading"><div><span className="sf-free-label">The Operator Sampler / Free</span><h1>Try my workflow.<br />On your next task.</h1><p className="sf-lead">One prompt script. One verification skill. One daily checklist. Read the files below, or download the whole folder.</p><a className="sf-button" href="/downloads/operator-sampler.zip" download><Download size={19} /> Download the free starter pack</a><p className="sf-fine-print">No account or email required. ZIP download. MIT licensed.</p></div><ol className="sf-first-steps"><li><span>1</span><div><h2>Open the folder</h2><p>Unzip the download and open 00-START-HERE.md.</p></div></li><li><span>2</span><div><h2>Try the prompt</h2><p>Open inspect-before-edit.md. Fill in the placeholders for a small task in your project.</p></div></li><li><span>3</span><div><h2>Check what changed</h2><p>Use the verification skill and checklist to review the result before calling it done.</p></div></li></ol></section><section className="sf-container sf-starter-preview" id="preview"><FolderPreview initialSelected={Number(new URLSearchParams(window.location.search).get("file"))} /></section><section className="sf-container sf-newsletter"><div><h2>Keep in touch.</h2><p>Get product news and notes from what I'm building. Optional, and you can unsubscribe.</p><a className="sf-text-link" href="/store">Browse the paid tools <ArrowRight size={18} /></a></div>{status === "success" ? <div className="sf-newsletter-success" role="status"><Check size={24} /><h3>You're on the list.</h3><p>{message}</p></div> : <form onSubmit={subscribe} aria-label="Product updates signup"><label>First name<input autoComplete="given-name" value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="sf-button sf-button-dark" disabled={status === "loading"}>{status === "loading" ? "Subscribing..." : "Subscribe to updates"}<ArrowRight size={18} /></button><p className="sf-fine-print">By subscribing, you agree to receive emails from AI with Murda. <a href="/privacy">Privacy policy</a>.</p>{message && <p className="sf-error" role="alert">{message}</p>}</form>}</section></main>;
}
