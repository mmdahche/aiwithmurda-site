// Copy plain text to the clipboard. Tries the Clipboard API first, then falls back to a hidden
// textarea and document.execCommand("copy") for embedded (in-app) browsers that block or lack it.
// Returns true when the text was copied, false when every path failed.
export async function copyPlainText(text) {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the manual copy path for embedded browsers.
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  // iPhone Safari ignores select() on a read-only field; an explicit range selects the whole value.
  textarea.setSelectionRange(0, text.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
