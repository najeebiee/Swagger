// ---- DATE HELPERS (shared by all pages) ----
function getDefaultDateRange(daysBack = 7) {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - daysBack);

  return {
    from: formatDateForInput(from),
    to: formatDateForInput(today)
  };
}

function formatDateForInput(date) {
  return date.toISOString().slice(0, 10); // yyyy-mm-dd
}

function formatDateForApi(inputValue) {
  return inputValue ? inputValue.replace(/-/g, '') : '';
}

// ---- GENERIC TABLE RENDERER (shared) ----
/**
 * @param {HTMLElement} container
 * @param {Array<{key:string,label:string}>} columns
 * @param {Array<Object>} rows
 * @param {string} emptyMessage
 */
function renderTable(container, columns, rows, emptyMessage = 'No data found for this filter.') {
  if (!container) return;
  container.innerHTML = '';

  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  const table = document.createElement('table');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  columns.forEach((col) => {
    const th = document.createElement('th');
    th.textContent = col.label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    columns.forEach((col) => {
      const td = document.createElement('td');
      td.textContent = row[col.key] ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.appendChild(table);
}

// Generate API key in the format: hhyyyymmdd
// Example: 11:00 on 2025-12-06 => "1120251206"
function generateApiKey(date = new Date()) {
  const pad2 = (n) => n.toString().padStart(2, '0');

  const hh   = pad2(date.getHours());       // 00–23
  const yyyy = date.getFullYear();          // 2025
  const mm   = pad2(date.getMonth() + 1);   // 01–12
  const dd   = pad2(date.getDate());        // 01–31

  return `${hh}${yyyy}${mm}${dd}`;
}

// ---- CSV EXPORTER (shared) ----
function exportRowsToCsv(columns, rows, filename = 'export.csv') {
  if (!Array.isArray(rows) || rows.length === 0) {
    alert('No data to export.');
    return;
  }

  const escapeValue = (value) => {
    const str = value == null ? '' : String(value);
    const escaped = str.replace(/"/g, '""');
    return /[",\n\r]/.test(str) ? `"${escaped}"` : escaped;
  };

  const headerLine = columns.map((col) => escapeValue(col.label)).join(',');
  const bodyLines = rows.map((row) =>
    columns.map((col) => escapeValue(row[col.key])).join(',')
  );

  const csvContent = [headerLine, ...bodyLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

window.exportRowsToCsv = exportRowsToCsv;

// ---- EXCEL EXPORTER (shared) ----
function exportRowsToXlsx(columns, rows, filename) {
  if (!Array.isArray(rows) || rows.length === 0) {
    alert('No data to export.');
    return;
  }

  if (typeof XLSX === 'undefined') {
    console.error('XLSX library is not loaded.');
    alert('Excel export is unavailable (XLSX library not loaded).');
    return;
  }

  const exportData = rows.map((row) => {
    const obj = {};
    columns.forEach((col) => {
      const raw = row[col.key] ?? '';
      obj[col.label] = raw;
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  const safeName = filename && filename.trim() ? filename : 'export.xlsx';

  XLSX.writeFile(workbook, safeName);
}

window.exportRowsToXlsx = exportRowsToXlsx;

// ---- EXPORT SUCCESS ALERT (shared) ----
function showExportSuccess(type) {
  if (typeof Swal === 'undefined') {
    console.warn('SweetAlert2 (Swal) is not loaded.');
    return;
  }

  let text = '';
  if (type === 'csv') {
    text = 'CSV file downloaded.';
  } else if (type === 'xlsx') {
    text = 'Excel file downloaded.';
  } else {
    text = 'File downloaded.';
  }

  Swal.fire({
    title: 'Export complete',
    text,
    icon: 'success',
    confirmButtonText: 'OK',
  });
}

window.showExportSuccess = showExportSuccess;

// ---- EXPORT CONFIRMATION (shared) ----
function confirmExport(type, onConfirm) {
  if (typeof Swal === 'undefined') {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    return;
  }

  let text = '';
  if (type === 'csv') {
    text = 'This will download the currently visible rows as CSV.';
  } else if (type === 'xlsx') {
    text = 'This will download the currently visible rows as Excel.';
  } else {
    text = 'This will download the current table data.';
  }

  Swal.fire({
    title: 'Export table data?',
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, export',
    cancelButtonText: 'Cancel',
  }).then((result) => {
    if (result.isConfirmed && typeof onConfirm === 'function') {
      onConfirm();
    }
  });
}

window.confirmExport = confirmExport;

// ---- PDF EXPORTER (shared) ----
function exportTableToPdf(columns, rows, title) {
  if (!Array.isArray(rows) || rows.length === 0) {
    alert('No data to export.');
    return;
  }

  const win = window.open('', '_blank');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site.');
    return;
  }

  const docTitle = title || 'Table Export';

  const style = `
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 16px;
      }
      h1 {
        font-size: 18px;
        margin-bottom: 12px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        font-size: 12px;
      }
      th, td {
        border: 1px solid #ccc;
        padding: 4px 8px;
        text-align: left;
      }
      th {
        background: #f2f2f2;
      }
      @media print {
        body { margin: 0; }
      }
    </style>
  `;

  let html = `<html><head><title>${docTitle}</title>${style}</head><body>`;
  html += `<h1>${docTitle}</h1>`;
  html += '<table><thead><tr>';

  columns.forEach((col) => {
    html += `<th>${col.label}</th>`;
  });

  html += '</tr></thead><tbody>';

  rows.forEach((row) => {
    html += '<tr>';
    columns.forEach((col) => {
      const value = row[col.key] ?? '';
      html += `<td>${String(value)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></body></html>';

  win.document.open();
  win.document.write(html);
  win.document.close();

  win.focus();
  win.print();
}

window.exportTableToPdf = exportTableToPdf;
