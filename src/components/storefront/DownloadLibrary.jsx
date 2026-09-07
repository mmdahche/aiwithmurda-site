import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Download, FileText, FolderOpen, Search } from "lucide-react";
import { downloadMemberAsset, downloadOperatorBundleAsset, downloadOperatorToolkitAsset, downloadOperatorArsenalAsset, downloadOperatorUpdateAsset } from "../../lib/api.js";

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
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleFiles = filtered.slice(currentPage * 12, (currentPage + 1) * 12);
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
  function button(file, label = "Download") {
    const state = downloadState[`${file.group.key}:${file.key}`];
    return <div className="sf-library-download"><button type="button" onClick={() => download(file)} disabled={state === "loading"}><Download size={17} />{state === "loading" ? "Downloading..." : label}</button>{state === "error" && <span role="alert">Download failed. Try again or refresh your access.</span>}{state === "success" && <span role="status">Download started.</span>}</div>;
  }
  return <section className="sf-library" aria-label="Your download library">
    {start && <div className="sf-library-start"><div><span><FolderOpen size={18} /> Start here</span><h2>{start.title}</h2><p>{start.group.key === "starter" ? "Your first session: choose a project, set up your tools, and make one small, checked change." : "Start with the setup instructions before installing files in your project."}</p></div>{button(start, "Download start guide")}</div>}
    <div className="sf-library-heading"><div><h2>Your files</h2><p>Purchased downloads, all in one place.</p></div><label className="sf-library-search"><Search size={17} /><input type="search" placeholder="Find a file..." aria-label="Search your downloads" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /></label></div>
    <div className="sf-library-filters" role="group" aria-label="Download collections"><button aria-pressed={collection === "all"} onClick={() => { setCollection("all"); setPage(0); }}>All files</button>{groups.map((group) => <button key={group.key} aria-pressed={collection === group.key} onClick={() => { setCollection(group.key); setPage(0); }}>{group.name}</button>)}</div>
    <p className="sf-library-count" role="status">{filtered.length} {filtered.length === 1 ? "file" : "files"}</p>
    <div className="sf-library-files">{visibleFiles.map((file) => <article key={`${file.group.key}:${file.key}`}><FileText size={21} /><div><h3>{file.title}</h3><p>{file.group.name} / {file.mimeType?.startsWith("application/zip") ? "ZIP folder" : "Guide"}</p></div>{button(file)}</article>)}</div>
    {pageCount > 1 && <nav className="sf-library-pagination" aria-label="Download pages"><button title="Previous page" aria-label="Previous download page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ArrowLeft size={18} /></button><span>Page {currentPage + 1} of {pageCount}</span><button title="Next page" aria-label="Next download page" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}><ArrowRight size={18} /></button></nav>}
    {!filtered.length && <p>No files match. Try another search or collection.</p>}
    <div className="sf-library-course"><div><h2>Want the guided path?</h2><p>Your lessons, progress, and deeper workspace are still here.</p></div><button onClick={onOpenCourse}>Open my workspace <ArrowRight size={18} /></button></div>
  </section>;
}
