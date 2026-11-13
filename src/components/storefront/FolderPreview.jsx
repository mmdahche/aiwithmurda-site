import React, { useState } from "react";
import { ChevronRight, Copy, FileText, Folder } from "lucide-react";
import { samplerParts } from "./StorefrontParts.jsx";

export function FolderPreview({ initialSelected = 0 }) {
  const [selected, setSelected] = useState(() => samplerParts[initialSelected] ? initialSelected : 0);
  const [copied, setCopied] = useState("");
  const sample = samplerParts[selected];
  async function copy() {
    try { await navigator.clipboard.writeText(sample.text); setCopied("Copied to clipboard."); }
    catch { setCopied("Copy is unavailable here. Download the sampler to open the file."); }
  }
  return <div className="sf-explorer">
    <div className="sf-explorer-bar"><span><Folder size={17} /> operator-sampler / payload</span><span>Free edition</span></div>
    <div className="sf-explorer-body">
      <div className="sf-file-list" role="group" aria-label="Sampler files">
        {samplerParts.map((file, i) => <button type="button" key={file.name} aria-pressed={selected === i} onClick={() => { setSelected(i); setCopied(""); }}><FileText size={18} /><span>{file.label}<small>{file.name}</small></span><ChevronRight size={15} /></button>)}
      </div>
      <div className="sf-file-preview"><div className="sf-file-heading"><span>{sample.name}</span><button type="button" title="Copy this file" aria-label="Copy this file" onClick={copy}><Copy size={17} /></button></div><pre tabIndex={0} aria-label={`Contents of ${sample.name}`}>{sample.text}</pre><p role="status" className="sf-copy-status">{copied || "Actual file from the free sampler."}</p></div>
    </div>
  </div>;
}
