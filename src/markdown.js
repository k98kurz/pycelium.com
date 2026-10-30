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
  text = text.replace(/`([^`]+)`/g, (match, code) => {
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000CODE_${codeSpans.length - 1}\u0000`;
  });

  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    return `<a href="${escapeAttr(url)}">${renderInline(label)}</a>`;
  });

  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  text = text.replace(
    /\u0000CODE_(\d+)\u0000/g,
    (m, i) => codeSpans[Number(i)],
  );

  return text;
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
      if (
        i + 1 < n &&
        /^\s*\|?\s*:?-+:?(\|\s*:?-+:?)*\|?\s*$/.test(lines[i + 1])
      ) {
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
