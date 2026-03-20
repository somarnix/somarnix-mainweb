type ExportHtmlTableAsExcelOptions = {
  centeredColumns: number[];
  columnWidths: string[];
  fileName: string;
  filterSummary: string;
  headers: string[];
  minWidth: string;
  rows: Array<Array<unknown>>;
  title: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function exportHtmlTableAsExcel({
  centeredColumns,
  columnWidths,
  fileName,
  filterSummary,
  headers,
  minWidth,
  rows,
  title,
}: ExportHtmlTableAsExcelOptions) {
  const centerCols = new Set(centeredColumns);

  const tableHeader = `<tr>${headers
    .map((header, index) => {
      const align = centerCols.has(index) ? "center" : "left";
      return `<th style="background:#0f766e;color:#ffffff;font-weight:700;text-align:${align};padding:9px 10px;border:1px solid #cbd5e1;">${escapeHtml(header)}</th>`;
    })
    .join("")}</tr>`;

  const tableBody = rows
    .map(
      (row, rowIndex) =>
        `<tr>${row
          .map((cell, colIndex) => {
            const align = centerCols.has(colIndex) ? "center" : "left";
            const background = rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc";
            return `<td style="vertical-align:top;text-align:${align};padding:8px 10px;border:1px solid #e2e8f0;background:${background};">${escapeHtml(cell).replace(/\n/g, "<br/>")}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");

  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const colGroup = columnWidths
    .map((width) => `<col style="width:${escapeHtml(width)};" />`)
    .join("");

  const html = `
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body style="background:#ffffff;margin:16px;">
    <div style="font-family:Calibri,Arial,sans-serif;">
      <h2 style="margin:0 0 4px 0;color:#0f172a;">${escapeHtml(title)}</h2>
      <p style="margin:0 0 2px 0;color:#475569;font-size:12px;">Generated: ${escapeHtml(generatedAt)}</p>
      <p style="margin:0 0 10px 0;color:#475569;font-size:12px;">${escapeHtml(filterSummary)}</p>
    </div>
    <table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12px;min-width:${escapeHtml(minWidth)};">
      <colgroup>
        ${colGroup}
      </colgroup>
      ${tableHeader}
      ${tableBody}
    </table>
  </body>
</html>`;

  const blob = new Blob([`\uFEFF${html}`], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
