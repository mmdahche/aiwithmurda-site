import React, { useState } from "react";
import { ChevronRight, Copy, Folder } from "lucide-react";
import { samplerParts } from "./StorefrontParts.jsx";

/*
  The Free Starter Pack, readable before download: pick one of the three
  files and read the real text. Tests rely on the pressed state of the file
  buttons, the "Contents of <file>" label on the text and the status line.
*/
export function FolderPreview({ initialSelected = 0 }) {
  const [selected, setSelected] = useState(() => samplerParts[initialSelected] ? initialSelected : 0);
  const [copied, setCopied] = useState("");
  const sample = samplerParts[selected];
  async function copy() {
    try { await navigator.clipboard.writeText(sample.text); setCopied("Copied to clipboard."); }
    catch { setCopied("Copy is unavailable here. Download the sampler to open the file."); }
  }
  return <div className="mx-card mx-card--free mx-fr-explorer">
    <div className="mx-fr-explorer-bar"><span><Folder className="mx-i" aria-hidden="true" /> operator-sampler / payload</span><span>Free edition</span></div>
    <div className="mx-fr-explorer-body">
      <div className="mx-fr-files" role="group" aria-label="Sampler files">
        {samplerParts.map((file, i) => <button type="button" key={file.name} aria-pressed={selected === i} onClick={() => { setSelected(i); setCopied(""); }}>
          <span className="mx-count" aria-hidden="true">0{i + 1}</span>
          <span className="mx-fr-file-name">{file.label}<small>{file.name}</small><span className="mx-fr-file-about">{file.description}</span></span>
          <ChevronRight className="mx-i" aria-hidden="true" />
        </button>)}
        <p className="mx-fr-files-more">Also in the download: <code>00-START-HERE.md</code>, <code>README.md</code>, <code>VERIFY.md</code>, <code>LICENSE</code> and the <code>install/</code> folder.</p>
      </div>
      <div className="mx-fr-view">
        <div className="mx-fr-view-head">
          <p><span>{sample.name}</span><small>{sample.format}</small></p>
          <button type="button" className="mx-fr-copy" title="Copy this file" aria-label="Copy this file" onClick={copy}><Copy className="mx-i" aria-hidden="true" /><span>Copy</span></button>
        </div>
        <pre className="mx-fr-pre" tabIndex={0} aria-label={`Contents of ${sample.name}`}>{sample.text}</pre>
        <p role="status" className="mx-fr-status">{copied || "Actual file from the free sampler."}</p>
      </div>
    </div>
  </div>;
}
