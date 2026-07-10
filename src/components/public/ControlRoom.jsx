import React from "react";

export function StatusRail({ items }) {
  if (!items?.length) return null;

  return (
    <div className="control-status-rail" aria-label="Sprint status">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note && <em>{item.note}</em>}
        </div>
      ))}
    </div>
  );
}

export function RouteHero({ label, title, body, primaryAction, secondaryAction, statusItems, children }) {
  return (
    <section className="control-hero">
      <div className="control-hero-copy">
        <StatusRail items={statusItems} />
        <span className="public-label">{label}</span>
        <h1>{title}</h1>
        <p>{body}</p>
        {(primaryAction || secondaryAction) && (
          <div className="hero-actions">
            {primaryAction && (
              <a className="primary-link" href={primaryAction.href}>
                {primaryAction.label}
              </a>
            )}
            {secondaryAction && (
              <a className="secondary-link" href={secondaryAction.href}>
                {secondaryAction.label}
              </a>
            )}
          </div>
        )}
      </div>
      {children && <div className="control-hero-monitor">{children}</div>}
    </section>
  );
}

export function ProofStrip({ items }) {
  if (!items?.length) return null;

  return (
    <section className="proof-strip" aria-label="Current proof signals">
      {items.map((item) => (
        <article key={item.label} className={item.tone ? `tone-${item.tone}` : undefined}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note && <em>{item.note}</em>}
        </article>
      ))}
    </section>
  );
}

export function MetricBoard({ items }) {
  if (!items?.length) return null;

  return (
    <section className="metric-board" aria-label="Sprint metrics">
      {items.map((item) => (
        <article key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.progress != null && (
            <div className="metric-board-meter" aria-label={`${item.progress}% complete`}>
              <i style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }} />
            </div>
          )}
          {item.note && <em>{item.note}</em>}
        </article>
      ))}
    </section>
  );
}

export function ReceiptPreview({ label, title, body, href, linkLabel = "Open receipt" }) {
  return (
    <article className="receipt-preview">
      <span>{label}</span>
      <strong>{title}</strong>
      <p>{body}</p>
      {href && (
        <a className="text-link" href={href}>
          {linkLabel}
        </a>
      )}
    </article>
  );
}

