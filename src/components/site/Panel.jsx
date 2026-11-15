import React from "react";

/* Small shared pieces of the site system. */

export const pad2 = (value) => String(value).padStart(2, "0");

// Numbered panel header: light-blue mono counter on the left, mono descriptor on the right.
export function PanelHead({ n, total, label, children }) {
  return <div className="mx-panel-head"><span className="mx-count">{label || `${pad2(n)} / ${pad2(total)}`}</span><span className="mx-desc">{children}</span></div>;
}
