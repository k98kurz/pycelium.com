import { renderMarkdown } from "./markdown.js";

let lastPct = -1;

self.onmessage = (e) => {
  if (e.data.type === "render") {
    const md = e.data.md;
    lastPct = -1;
    const html = renderMarkdown(md, (pct) => {
      if (pct !== lastPct) {
        lastPct = pct;
        self.postMessage({ type: "progress", pct });
      }
    });
    self.postMessage({ type: "done", html });
  }
};
