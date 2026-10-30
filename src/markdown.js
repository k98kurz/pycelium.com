export function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function escapeAttr(text) {
  return text
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text) {
  const codeSpans = [];

  let result = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "`") {
      const end = text.indexOf("`", i + 1);
      if (end === -1) {
        result += text.slice(i);
        break;
      }
      const code = text.slice(i + 1, end);
      codeSpans.push(`<code>${escapeHtml(code)}</code>`);
      result += `\u0000CODE_${codeSpans.length - 1}\u0000`;
      i = end + 1;
    } else if (c === "[") {
      const lb = text.indexOf("]", i + 1);
      if (lb !== -1 && text[lb + 1] === "(") {
        const rb = text.indexOf(")", lb + 2);
        if (rb !== -1) {
          const label = text.slice(i + 1, lb);
          const url = text.slice(lb + 2, rb);
          result += `<a href="${escapeAttr(url)}">${renderInline(label)}</a>`;
          i = rb + 1;
          continue;
        }
      }
      result += c;
      i++;
    } else {
      result += c;
      i++;
    }
  }

  let out = "";
  i = 0;
  while (i < result.length) {
    if (result[i] === "*") {
      let run = 0;
      while (i + run < result.length && result[i + run] === "*") run++;
      const contentEnd = result.indexOf("*", i + run);
      if (contentEnd !== -1) {
        const content = result.slice(i + run, contentEnd);
        if (!content.includes("*")) {
          let closeRun = 0;
          let p = contentEnd;
          while (p < result.length && result[p] === "*") {
            closeRun++;
            p++;
          }
          if (closeRun === run && (run === 1 || run === 2 || run === 3)) {
            let wrapped;
            if (run === 3) wrapped = `<strong><em>${content}</em></strong>`;
            else if (run === 2) wrapped = `<strong>${content}</strong>`;
            else wrapped = `<em>${content}</em>`;
            out += wrapped;
            i = contentEnd + run;
            continue;
          }
        }
      }
      out += "*".repeat(run);
      i += run;
    } else {
      out += result[i];
      i++;
    }
  }

  return out.replace(
    /\u0000CODE_(\d+)\u0000/g,
    (m, idx) => codeSpans[Number(idx)],
  );
}

function parseTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((c) => c.trim());
}

export function renderMarkdown(md) {
  md = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = md.split("\n");
  const n = lines.length;
  let html = "";
  let i = 0;

  while (i < n) {
    let line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const code = [];
      i++;
      while (i < n && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++;
      const codeText = escapeHtml(code.join("\n"));
      html += `<pre class="markdown-code">${codeText}</pre>\n`;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2]);
      html += `<h${level} class="markdown-h${level}">${content}</h${level}>\n`;
      i++;
      continue;
    }

    if (line.trim().startsWith("|") || line.startsWith("|")) {
      if (i + 1 < n && /^\|?\s*[-: ]+(\|[-: ]+)*\|?\s*$/.test(lines[i + 1])) {
        const headerCells = parseTableRow(line);
        let tableHtml = '<table class="markdown-table"><thead><tr>';
        for (let c = 0; c < headerCells.length; c++) {
          tableHtml += `<th>${renderInline(headerCells[c])}</th>`;
        }
        tableHtml += "</tr></thead><tbody>";
        i += 2;
        while (
          i < n &&
          lines[i].trim().startsWith("|") &&
          lines[i].trim() !== ""
        ) {
          const cells = parseTableRow(lines[i]);
          tableHtml += "<tr>";
          for (let c = 0; c < headerCells.length; c++) {
            const cell = cells[c] !== undefined ? cells[c] : "";
            tableHtml += `<td>${renderInline(cell)}</td>`;
          }
          tableHtml += "</tr>";
          i++;
        }
        tableHtml += "</tbody></table>\n";
        html += tableHtml;
        continue;
      }
    }

    if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const isOrdered = /^\d+\.\s+/.test(line);
      const items = [];
      let currentText = "";
      let inItem = false;
      while (i < n) {
        const l = lines[i];
        if (l.trim() === "") break;
        const isListItem = /^[-*+]\s+/.test(l) || /^\d+\.\s+/.test(l);
        if (isListItem) {
          if (inItem) {
            items.push(renderInline(currentText.trim()));
            currentText = "";
          }
          currentText = l.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "");
          inItem = true;
          i++;
        } else if (/^\s+/.test(l) && currentText !== "") {
          currentText += " " + l.trim();
          i++;
        } else {
          break;
        }
      }
      if (inItem) items.push(renderInline(currentText.trim()));
      const tag = isOrdered ? "ol" : "ul";
      html += `<${tag} class="markdown-list">`;
      for (const item of items) {
        html += `<li>${item}</li>`;
      }
      html += `</${tag}>\n`;
      continue;
    }

    const para = [];
    while (
      i < n &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].match(/^(#{1,3})\s+/) &&
      !lines[i].trim().startsWith("|") &&
      !(/^[-*+]\s+/.test(lines[i]) || /^\d+\.\s+/.test(lines[i]))
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) {
      const text = para.join(" ");
      html += `<p class="markdown-p">${renderInline(text)}</p>\n`;
    }
  }

  return html;
}

export function renderMarkdownInto(el, md) {
  el.classList.add("markdown-body");
  el.innerHTML =
    '<div class="markdown-content">' + renderMarkdown(md) + "</div>";
  return el;
}
