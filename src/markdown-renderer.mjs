import { renderMarkdown } from "./markdown.js";

self.onmessage = (e) => {
  if (e.data.type === "render") {
    const md = e.data.md;
    const html = renderMarkdown(md);
    self.postMessage({ type: "done", html });
  }
};
