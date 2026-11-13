import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Download, FileText, FolderArchive, Search } from "lucide-react";
import { CheckItFirstNotice } from "../../pages/CheckItFirstPage.jsx";
import { downloadMemberAsset, downloadOperatorBundleAsset, downloadOperatorToolkitAsset, downloadOperatorArsenalAsset, downloadOperatorUpdateAsset } from "../../lib/api.js";

/*
  My Downloads: every file the signed-in buyer owns, in one list.

  Hooks the Playwright suites rely on, keep them as written: `.sf-library-start`
  (the start-guide card, which must contain its own download alert),
  `.sf-library-files article` (one per visible file, 12 per page), the
  "Your files" heading, the "Search your downloads" searchbox, the
  "Download collections" group, "Previous/Next download page",
  "Download start guide" and "Open my workspace". Styles: src/site/members.css.
*/

const pageSize = 12;

// The server strips mimeType from member assets, so the download name is the reliable signal.
function isZip(file) {
  return Boolean(file.mimeType?.startsWith("application/zip")) || /\.zip$/i.test(file.downloadName || file.fileName || "");
}

export function DownloadLibrary({ memberData, accessToken, access, onOpenCourse }) {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("all");
  const [page, setPage] = useState(0);
  const [downloadState, setDownloadState] = useState({});
  const groups = useMemo(() => [
    { key: "starter", name: "Future Proof Method", assets: memberData?.product?.assets || [], download: downloadMemberAsset, first: "quickstart" },
    { key: "bundle", name: "Operator Bundle", assets: memberData?.operatorBundle?.assets || [], download: downloadOperatorBundleAsset, first: "operator-skill-vault" },
    { key: "toolkit", name: "Operator Toolkit", assets: memberData?.operatorToolkit?.assets || [], download: downloadOperatorToolkitAsset, first: "system-installation-guide" },
    { key: "arsenal", name: "Operator Arsenal", assets: memberData?.operatorArsenal?.shelfAssets || [], download: downloadOperatorArsenalAsset },
    { key: "updates", name: "System Updates", assets: memberData?.operatorToolkit?.updateAssets || [], download: downloadOperatorUpdateAsset },
  ].filter((group) => access[group.key] && group.assets.length), [memberData, access]);
  const files = groups.flatMap((group) => group.assets.map((asset) => ({ ...asset, group })));
  const filtered = files.filter((file) => (collection === "all" || file.group.key === collection) && `${file.title} ${file.key}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleFiles = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const start = files.find((file) => file.key === "quickstart") || files.find((file) => file.key === file.group.first);

  async function download(file) {
    const id = `${file.group.key}:${file.key}`;
    setDownloadState((previous) => ({ ...previous, [id]: "loading" }));
    try {
      const blob = await file.group.download(file.key, accessToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = file.downloadName || file.fileName || `${file.key}.md`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloadState((previous) => ({ ...previous, [id]: "success" }));
    } catch { setDownloadState((previous) => ({ ...previous, [id]: "error" })); }
  }

  function button(file, label = "Download", primary = false) {
    const state = downloadState[`${file.group.key}:${file.key}`];
    return (
      <div className="mx-lib-get">
        <button type="button" className={primary ? "mx-btn" : "mx-btn mx-btn--ghost mx-btn--sm"} onClick={() => download(file)} disabled={state === "loading"}>
          <Download className="mx-i" aria-hidden="true" />
          <span className="mx-lib-get-label">{state === "loading" ? "Downloading..." : label}</span>
        </button>
        {state === "error" && <span className="mx-lib-msg mx-lib-msg--error" role="alert">Download failed. Try again or refresh your access.</span>}
        {state === "success" && <span className="mx-lib-msg" role="status">Download started.</span>}
      </div>
    );
  }

  return (
    <section className="mx-panel mx-mview mx-library" aria-label="Your download library">
      <div className="mx-panel-head">
        <span className="mx-count">02 / 02</span>
        <span className="mx-desc">Download library</span>
      </div>

      <CheckItFirstNotice />

      {start && (
        <div className="mx-card mx-lib-start sf-library-start">
          <div className="mx-lib-start-copy">
            <p className="mx-ticker mx-ticker--paid">
              <span className="mx-ticker-tag">Start here</span>
              <span className="mx-ticker-bar">{start.group.name}</span>
            </p>
            <h2 className="mx-title">{start.title}</h2>
            <p className="mx-text">
              {start.group.key === "starter"
                ? "Your first session: choose a project, set up your tools, and make one small, checked change."
                : "Start with the setup instructions before installing files in your project."}
            </p>
          </div>
          {button(start, "Download start guide", true)}
        </div>
      )}

      <div className="mx-lib-head">
        <div className="mx-lib-head-copy">
          <h2 className="mx-display mx-mblock-h">Your files</h2>
          <p className="mx-text">Purchased downloads, all in one place.</p>
        </div>
        <label className="mx-search mx-lib-search">
          <Search className="mx-i" aria-hidden="true" />
          <input
            type="search"
            placeholder="Find a file..."
            aria-label="Search your downloads"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(0); }}
          />
        </label>
      </div>

      <div className="mx-lib-bar">
        <div className="mx-filters" role="group" aria-label="Download collections">
          <button type="button" aria-pressed={collection === "all"} onClick={() => { setCollection("all"); setPage(0); }}>All files</button>
          {groups.map((group) => (
            <button type="button" key={group.key} aria-pressed={collection === group.key} onClick={() => { setCollection(group.key); setPage(0); }}>{group.name}</button>
          ))}
        </div>
        <p className="mx-result mx-lib-count" role="status">{filtered.length} {filtered.length === 1 ? "file" : "files"}</p>
      </div>

      <div className="mx-lib-files sf-library-files">
        {visibleFiles.map((file) => {
          const zip = isZip(file);
          const FileIcon = zip ? FolderArchive : FileText;
          return (
            <article key={`${file.group.key}:${file.key}`}>
              <span className="mx-tile mx-tile--sm" aria-hidden="true"><FileIcon className="mx-i" /></span>
              <div className="mx-lib-file">
                <h3>{file.title}</h3>
                <p>{file.group.name} / {zip ? "ZIP folder" : "Guide"}</p>
              </div>
              {button(file)}
            </article>
          );
        })}
      </div>

      {!filtered.length && <p className="mx-lib-empty">No files match. Try another search or collection.</p>}

      {pageCount > 1 && (
        <nav className="mx-lib-pages" aria-label="Download pages">
          <button type="button" className="mx-btn mx-btn--ghost mx-btn--sm" title="Previous page" aria-label="Previous download page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
            <ArrowLeft className="mx-i" aria-hidden="true" />
          </button>
          <span>Page {currentPage + 1} of {pageCount}</span>
          <button type="button" className="mx-btn mx-btn--ghost mx-btn--sm" title="Next page" aria-label="Next download page" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>
            <ArrowRight className="mx-i" aria-hidden="true" />
          </button>
        </nav>
      )}

      <div className="mx-card mx-lib-course">
        <div className="mx-lib-course-copy">
          <h2 className="mx-title">Want the guided path?</h2>
          <p className="mx-text">Your lessons, progress, and deeper workspace are still here.</p>
        </div>
        <button type="button" className="mx-btn" onClick={onOpenCourse}>
          Open my workspace
          <ArrowRight className="mx-i" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
