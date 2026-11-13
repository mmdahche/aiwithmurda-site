import React from "react";
import { ArrowRight } from "lucide-react";

export function LegalPage({ type }) {
  const isPrivacy = type === "privacy";

  return (
    <main className="mx mx-page mx-legal" id="main-content">
      <article className="mx-container mx-panel" aria-labelledby="legal-title">
        <div className="mx-panel-head">
          <span className="mx-count">{isPrivacy ? "02 / 02" : "01 / 02"}</span>
          <span className="mx-desc">{isPrivacy ? "Data and account access" : "Service agreement"}</span>
        </div>

        <header className="mx-legal-head">
          <h1 className="mx-display mx-display--lg" id="legal-title">{isPrivacy ? "Privacy Policy" : "Terms of Service"}</h1>
          <div className="mx-legal-meta">
            <p>Effective July 10, 2026</p>
            <p>Contact <a href="mailto:murad@aiwithmurda.com">murad@aiwithmurda.com</a></p>
          </div>
        </header>

        {isPrivacy ? (
          <div className="mx-legal-body">
            <section>
              <h2>Overview</h2>
              <p>
                AI with Murda operates public dashboards, streaming overlays, educational products, and
                member tools. This policy explains what information we collect and how it is used when
                you visit the site, join a product, or connect a social account.
              </p>
            </section>
            <section>
              <h2>Information we collect</h2>
              <p>
                We may collect contact information you submit, purchase and membership records, basic
                service usage data, and information you authorize through a connected platform. For a
                TikTok connection, this may include an account identifier, display name, username,
                avatar or profile link, and follower statistics covered by the scopes you approve.
              </p>
            </section>
            <section>
              <h2>How information is used</h2>
              <p>
                We use this information to operate the site, provide purchased access, display verified
                social metrics, maintain the combined follower ticker, prevent abuse, support users, and
                improve the service. We do not sell connected social account data.
              </p>
            </section>
            <section>
              <h2>Connected accounts and security</h2>
              <p>
                Social access tokens are stored server-side in encrypted form and are not exposed on the
                public dashboard. You can revoke a platform authorization through that platform or ask us
                to disconnect the account. Disconnecting removes the account from the combined total and
                stops future metric refreshes.
              </p>
            </section>
            <section>
              <h2>Service providers</h2>
              <p>
                We use infrastructure and payment providers such as Render, Supabase, Stripe, and Resend,
                plus the social platforms you choose to connect. These providers process information only
                as needed to deliver their services and are governed by their own terms and policies.
              </p>
            </section>
            <section>
              <h2>Retention and choices</h2>
              <p>
                We retain information while it is needed to provide the service, maintain transaction
                records, meet legal obligations, or resolve disputes. You may request access, correction,
                disconnection, or deletion by contacting us. Some transaction records may be retained when
                required by law.
              </p>
            </section>
            <section>
              <h2>Children and policy changes</h2>
              <p>
                The service is not directed to children under 13. We may update this policy as the service
                changes. Material updates will be posted here with a revised effective date.
              </p>
            </section>
            <section>
              <h2>Contact</h2>
              <p>Email privacy questions or requests to <a href="mailto:murad@aiwithmurda.com">murad@aiwithmurda.com</a>.</p>
            </section>
          </div>
        ) : (
          <div className="mx-legal-body">
            <section>
              <h2>Agreement</h2>
              <p>
                By accessing AI with Murda, creating an account, purchasing a product, or connecting a
                social account, you agree to these terms. If you do not agree, do not use the service.
              </p>
            </section>
            <section>
              <h2>The service</h2>
              <p>
                AI with Murda provides public progress dashboards, streaming tools, educational material,
                downloadable resources, member workspaces, and optional social metric integrations.
                Features may change as the products and live build evolve.
              </p>
            </section>
            <section>
              <h2>Accounts and social authorization</h2>
              <p>
                You are responsible for your account credentials and for activity performed through your
                account. When you connect a social platform, you authorize only the permissions shown on
                that platform's consent screen. You may revoke that authorization at any time.
              </p>
            </section>
            <section>
              <h2>Purchases and access</h2>
              <p>
                Prices and billing terms are shown before checkout. Digital access is personal and may not
                be resold, shared, or redistributed unless the offer explicitly permits it. Subscription
                access continues until canceled under the terms shown at purchase.
              </p>
            </section>
            <section>
              <h2>Acceptable use</h2>
              <p>
                Do not misuse the service, interfere with its operation, attempt unauthorized access,
                scrape private areas, upload malicious material, impersonate others, or use the service in
                violation of law or another platform's rules.
              </p>
            </section>
            <section>
              <h2>Ownership</h2>
              <p>
                The site, course material, software, branding, and original resources remain the property
                of their respective owners. Purchasing access grants a limited, non-transferable right to
                use the included material for your own work.
              </p>
            </section>
            <section>
              <h2>Availability and responsibility</h2>
              <p>
                The service is provided as available. We do not guarantee uninterrupted operation,
                specific income, follower growth, or business results. To the extent allowed by law, AI
                with Murda is not liable for indirect or consequential losses arising from use of the
                service or third-party platforms.
              </p>
            </section>
            <section>
              <h2>Termination and changes</h2>
              <p>
                Access may be suspended for abuse, fraud, nonpayment, or material violations of these
                terms. We may update these terms as the service changes and will post the revised version
                here with a new effective date.
              </p>
            </section>
            <section>
              <h2>Contact</h2>
              <p>Questions about these terms can be sent to <a href="mailto:murad@aiwithmurda.com">murad@aiwithmurda.com</a>.</p>
            </section>
          </div>
        )}

        <footer className="mx-legal-end">
          {isPrivacy
            ? <a className="mx-link" href="/terms">Read the Terms of Service <ArrowRight className="mx-i" aria-hidden="true" /></a>
            : <a className="mx-link" href="/privacy">Read the Privacy Policy <ArrowRight className="mx-i" aria-hidden="true" /></a>}
          <a className="mx-link" href="/store">Back to the shop <ArrowRight className="mx-i" aria-hidden="true" /></a>
        </footer>
      </article>
    </main>
  );
}
