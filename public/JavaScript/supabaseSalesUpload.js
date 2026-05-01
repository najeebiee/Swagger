// JavaScript/supabaseSalesUpload.js

const SUPPORTED_TYPES = [
  'BPGUARD',
  'SGGUARD',
  'Synbiotic+ MM',
  'Silver',
  'Gold',
  'Platinum'
];

const TYPE_CANON_MAP = {
  'bpguard': 'BPGUARD',
  'sgguard': 'SGGUARD',
  'synbiotic+ mm': 'Synbiotic+ MM',
  'silver': 'Silver',
  'gold': 'Gold',
  'platinum': 'Platinum'
};

function normalizeItemType(raw) {
  if (!raw) return '';
  return String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
}

function getRowMapKey(rowId) {
  return rowId == null ? '' : String(rowId);
}

function getFallbackItemsFromRaw(row) {
  if (!row || !row.items_raw) return [];
  const parsed = parseItems(row.items_raw, 0, row.sheet_name || 'Supabase');
  return parsed.items || [];
}

function getItemsForRow(row, itemsMap) {
  let items = [];
  if (itemsMap && row && row.id != null) {
    items = itemsMap.get(getRowMapKey(row.id)) || [];
  } else if (row && Array.isArray(row.items)) {
    items = row.items;
  }
  if (items && items.length) return items;
  return getFallbackItemsFromRaw(row);
}

const salesUploadColumns = [
  { key: 'transacted_at', label: 'TRANSACTED AT' },
  { key: 'depot', label: 'DEPOT' },
  { key: 'ps_code', label: 'PS CODE' },
  { key: 'account_type', label: 'ACCOUNT TYPE' },
  { key: 'buyer_name', label: 'BUYER NAME' },
  { key: 'buyer_username', label: 'USERNAME' },
  { key: 'items_raw', label: 'ITEMS RAW' },
  { key: 'amount', label: 'AMOUNT' }
];

let workbookCache = null;
let parsedRows = [];
let parsedVisibleRows = [];
let previewBaseRows = [];
let supabaseRows = [];
let supabaseVisibleRows = [];
let supabaseBaseRows = [];
let supabaseItemsByRowId = new Map();
let currentMode = 'supabase';
let currentFilename = '';
const filterState = {
  allRows: [],
  searchTerm: '',
  warningsOnly: false,
  visibleRows: []
};

function initSupabaseSalesUpload() {
  const tableContainer = document.getElementById('tableContainer');
  const statusArea = document.getElementById('statusArea');

  try {
    if (typeof window.getSupabase !== 'function') {
      throw new Error('Supabase client is not available.');
    }
    window.getSupabase();
  } catch (err) {
    showPageError(tableContainer, err.message || 'Failed to initialize Supabase.');
    if (statusArea) {
      showStatus(err.message || 'Failed to initialize Supabase.', 'error');
    }
    return;
  }

  const fileInput = document.getElementById('excelFile');
  const sheetSelect = document.getElementById('sheetSelect');
  const parseBtn = document.getElementById('parsePreviewBtn');
  const importBtn = document.getElementById('importBtn');
  const filterForm = document.getElementById('sales-upload-filter-form');
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  const tableSearch = document.getElementById('tableSearch');
  const clearSearch = document.getElementById('clearSearch');
  const warningsToggle = document.getElementById('warningsOnlyToggle');
  const exportCsvBtn = document.getElementById('exportCsv');
  const exportXlsxBtn = document.getElementById('exportXlsx');
  const exportPdfBtn = document.getElementById('exportPdf');

  const { from, to } = typeof getDefaultDateRange === 'function'
    ? getDefaultDateRange()
    : { from: '', to: '' };

  if (startDate && !startDate.value) startDate.value = from;
  if (endDate && !endDate.value) endDate.value = to;

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files || !fileInput.files[0]) return;
      currentFilename = fileInput.files[0].name || '';
      await loadWorkbook(fileInput.files[0], sheetSelect);
    });
  }

  if (parseBtn) {
    parseBtn.addEventListener('click', async () => {
      if (!workbookCache) {
        showStatus('Please select an Excel file first.', 'warn');
        return;
      }
      if (typeof XLSX === 'undefined') {
        alert('XLSX library is not loaded.');
        return;
      }
      const sheetName = sheetSelect ? sheetSelect.value : '__ALL__';
      const rows = parseWorkbookRows(workbookCache, sheetName);
      parsedRows = rows;
      currentMode = 'preview';
      applyPreviewFilterAndRender();
      updateImportButtonState();
      showParseWarnings(rows);
    });
  }

  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      await importParsedRows();
    });
  }

  if (filterForm) {
    filterForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!startDate || !endDate) return;
      if (currentMode === 'preview') {
        applyPreviewFilterAndRender();
      } else {
        await loadSupabaseRowsByDateRange();
      }
    });
  }

  if (tableSearch) {
    tableSearch.addEventListener('input', () => {
      filterState.searchTerm = tableSearch.value.trim().toLowerCase();
      applyFiltersAndRender();
    });
  }

  if (clearSearch) {
    clearSearch.addEventListener('click', (event) => {
      event.preventDefault();
      if (tableSearch) tableSearch.value = '';
      clearSearch.disabled = true;
      filterState.searchTerm = '';
      applyFiltersAndRender();
    });
  }

  if (warningsToggle) {
    warningsToggle.addEventListener('change', () => {
      filterState.warningsOnly = warningsToggle.checked;
      applyFiltersAndRender();
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const rows = getCurrentVisibleRows();
      confirmExport('csv', () => {
        exportRowsToCsv(salesUploadColumns, rows, 'sales-upload.csv');
        showExportSuccess('csv');
      });
    });
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      const rows = getCurrentVisibleRows();
      confirmExport('xlsx', () => {
        exportRowsToXlsx(salesUploadColumns, rows, 'sales-upload.xlsx');
        showExportSuccess('xlsx');
      });
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      const rows = getCurrentVisibleRows();
      exportTableToPdf(salesUploadColumns, rows, 'Sales Upload (Supabase)');
    });
  }

  const tableWrapper = document.getElementById('tableContainer');
  if (tableWrapper) {
    tableWrapper.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('.preview-items-btn');
      if (!button) return;
      const rowIndex = button.dataset.index;
      const rowId = button.dataset.rowId;
      if (currentMode === 'preview' && rowIndex != null) {
        const row = parsedVisibleRows[Number(rowIndex)];
        if (row) openItemsModal(row, row.items, row.warnings);
      }
      if (currentMode === 'supabase' && rowId) {
        const row = supabaseVisibleRows.find((r) => String(r.id) === String(rowId));
        if (!row) return;
        const items = await ensureSupabaseItemsForRow(row.id);
        const fallbackItems = (!items || !items.length) ? getFallbackItemsFromRaw(row) : items;
        openItemsModal(row, fallbackItems, []);
      }
    });
  }

  initModalControls();
  loadSupabaseRowsByDateRange();
}

function showPageError(container, message) {
  if (!container) return;
  container.innerHTML = `<div class="empty-state">${message}</div>`;
}

function showStatus(message, level = 'info') {
  const statusArea = document.getElementById('statusArea');
  if (!statusArea) return;
  statusArea.textContent = message;
  statusArea.style.display = 'block';
  statusArea.classList.remove('warn');
  if (level === 'warn' || level === 'error') {
    statusArea.classList.add('warn');
  }
}

function clearStatus() {
  const statusArea = document.getElementById('statusArea');
  if (!statusArea) return;
  statusArea.textContent = '';
  statusArea.style.display = 'none';
  statusArea.classList.remove('warn');
}

async function loadWorkbook(file, sheetSelect) {
  if (typeof XLSX === 'undefined') {
    alert('XLSX library is not loaded.');
    return;
  }

  showStatus('Loading workbook...');

  const arrayBuffer = await file.arrayBuffer();
  workbookCache = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  if (sheetSelect) {
    sheetSelect.innerHTML = '<option value="__ALL__">All Sheets (Recommended)</option>';
    workbookCache.SheetNames.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sheetSelect.appendChild(opt);
    });
  }

  clearStatus();
}

function parseWorkbookRows(workbook, sheetName) {
  const sheetNames = sheetName === '__ALL__'
    ? workbook.SheetNames
    : [sheetName];

  const rows = [];

  sheetNames.forEach((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return;
    const data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false
    });

    data.forEach((row, idx) => {
      const parsed = parseRowByIndex(row, idx + 1, name);
      if (parsed) rows.push(parsed);
    });
  });

  return rows;
}

function parseRowByIndex(row, rowNumber, sheetName) {
  if (!row || row.length === 0) return null;

  const transactedRaw = row[0];
  const transactedAtIso = normalizeExcelDate(transactedRaw);
  if (!transactedAtIso) return null;

  const depot = safeString(row[1]);
  const psCode = safeString(row[2]);
  const accountType = safeString(row[3]);
  const buyerRaw = safeString(row[4]);
  const itemsRaw = safeString(row[5]);
  const amount = normalizeAmount(row[6]);

  const { buyerName, buyerUsername } = parseBuyer(buyerRaw);
  const parsedItems = parseItems(itemsRaw, rowNumber, sheetName);

  return {
    sheet_name: sheetName,
    transacted_at: transactedAtIso,
    depot,
    ps_code: psCode,
    account_type: accountType,
    buyer_raw: buyerRaw,
    buyer_name: buyerName,
    buyer_username: buyerUsername,
    items_raw: itemsRaw,
    amount,
    items: parsedItems.items,
    warnings: parsedItems.warnings,
    parse_warnings: parsedItems.warnings,
    has_warning: parsedItems.warnings.length > 0
  };
}

function normalizeExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const jsDate = new Date(Date.UTC(
      parsed.y,
      parsed.m - 1,
      parsed.d,
      parsed.H,
      parsed.M,
      parsed.S
    ));
    return jsDate.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }
  return null;
}

function normalizeAmount(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function safeString(value) {
  return value == null ? '' : String(value).trim();
}

function parseBuyer(raw) {
  const text = raw || '';
  const left = text.indexOf('[');
  const right = text.indexOf(']');

  if (left >= 0 && right > left) {
    return {
      buyerName: text.slice(0, left).trim(),
      buyerUsername: text.slice(left + 1, right).trim()
    };
  }

  return { buyerName: text.trim(), buyerUsername: '' };
}

function parseItems(raw, rowNumber, sheetName) {
  const warnings = [];
  const items = [];
  if (!raw) return { items, warnings };

  let text = String(raw).trim();
  if (!text) return { items, warnings };

  text = text.replace(/^"|"$/g, '');
  text = text.replace(/\r\n/g, '\n');

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  lines.forEach((line) => {
    const match = line.match(/^(.+?)\s*\*\s*(\d+)\s*$/);
    if (!match) {
      warnings.push(`Unrecognized item format: "${line}"`);
      return;
    }

    const typeRaw = match[1].trim();
    const qty = parseInt(match[2], 10) || 0;
    const normalizedKey = normalizeItemType(typeRaw);
    const canonical = TYPE_CANON_MAP[normalizedKey];

    if (!canonical) {
      warnings.push(`Unknown item type: "${typeRaw}"`);
      return;
    }

    if (qty > 0) {
      items.push({ item_type: canonical, qty });
    }
  });

  if (warnings.length) {
    warnings.unshift(`Sheet ${sheetName}, row ${rowNumber}`);
  }

  return { items, warnings };
}

function applyPreviewFilterAndRender() {
  const filtered = filterRowsByDate(parsedRows);
  previewBaseRows = filtered;
  filterState.allRows = filtered.slice();
  applyFiltersAndRender();
}

function getBaseRows() {
  return currentMode === 'preview' ? previewBaseRows : supabaseBaseRows;
}

function getCurrentVisibleRows() {
  return currentMode === 'preview' ? parsedVisibleRows : supabaseVisibleRows;
}

function applyFiltersAndRender() {
  const clearBtn = document.getElementById('clearSearch');
  if (clearBtn) clearBtn.disabled = !filterState.searchTerm;

  let filtered = filterState.allRows.slice();

  if (filterState.warningsOnly) {
    filtered = filtered.filter((row) =>
      row.has_warning === true || (row.parse_warnings && row.parse_warnings.length > 0)
    );
  }

  if (filterState.searchTerm) {
    const term = filterState.searchTerm;
    filtered = filtered.filter((row) =>
      salesUploadColumns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(term))
    );
  }

  filterState.visibleRows = filtered;

  if (currentMode === 'preview') {
    parsedVisibleRows = filtered;
  } else {
    supabaseVisibleRows = filtered;
  }

  renderCurrentTable(filtered, currentMode);
  const cards = computeCardsFromRows(filtered, currentMode === 'supabase' ? supabaseItemsByRowId : null);
  renderSummaryCards(cards);
  updateWarningsBadge(filterState.allRows);
}

function renderCurrentTable(rows, mode) {
  const tableContainer = document.getElementById('tableContainer');
  if (!tableContainer) return;

  tableContainer.innerHTML = '';

  if (!rows.length) {
    const message = filterState.warningsOnly
      ? 'No warning rows found for the current filter.'
      : 'No rows available for this view.';
    tableContainer.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  salesUploadColumns.forEach((col) => {
    const th = document.createElement('th');
    th.textContent = col.label;
    headerRow.appendChild(th);
  });

  const actionTh = document.createElement('th');
  actionTh.textContent = 'ACTIONS';
  headerRow.appendChild(actionTh);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  rows.forEach((row, index) => {
    const tr = document.createElement('tr');

    salesUploadColumns.forEach((col) => {
      const td = document.createElement('td');
      let value = row[col.key] ?? '';
      if (col.key === 'transacted_at' && value) {
        const dt = new Date(value);
        value = Number.isNaN(dt.getTime()) ? value : dt.toLocaleString();
      }
      if (col.key === 'amount' && typeof value === 'number') {
        value = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      td.textContent = value;
      if (col.key === 'items_raw' && row.has_warning) {
        const warn = document.createElement('span');
        warn.className = 'warn-pill';
        warn.textContent = 'Warning';
        warn.title = 'This row has parsing warnings. Click Preview Items.';
        td.appendChild(document.createTextNode(' '));
        td.appendChild(warn);
      }
      tr.appendChild(td);
    });

    const actionTd = document.createElement('td');
    actionTd.className = 'actions-cell';
    const badge = document.createElement('span');
    const itemCount = getItemsForRow(row, mode === 'preview' ? null : supabaseItemsByRowId).length;
    badge.className = 'item-badge';
    badge.textContent = `${itemCount} items`;
    actionTd.appendChild(badge);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preview-items-btn';
    button.setAttribute('aria-label', 'Preview Items');
    button.title = 'Preview Items';
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke-width="1.8"/></svg>';
    if (mode === 'preview') {
      button.dataset.index = String(index);
    } else {
      button.dataset.rowId = String(row.id || '');
    }
    actionTd.appendChild(button);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableContainer.appendChild(table);
}

function computeCardsFromRows(rows, itemsMap) {
  const nameSet = new Set();
  const totals = {
    'BPGUARD': 0,
    'SGGUARD': 0,
    'Synbiotic+ MM': 0,
    'Silver': 0,
    'Gold': 0,
    'Platinum': 0
  };

  rows.forEach((row) => {
    const nameKey = (row.buyer_name || '').trim().toLowerCase();
    if (nameKey) nameSet.add(nameKey);

    const items = getItemsForRow(row, itemsMap);

    items.forEach((item) => {
      const label = TYPE_CANON_MAP[normalizeItemType(item.item_type)] || item.item_type;
      if (totals[label] != null) {
        totals[label] += Number(item.qty || 0);
      }
    });
  });

  return {
    uniqueNames: nameSet.size,
    totals
  };
}

function renderSummaryCards(cards) {
  const summary = document.getElementById('summaryCards');
  if (!summary) return;

  const { uniqueNames, totals } = cards;

  summary.innerHTML = `
    <div class="card">
      <p class="card-title">Unique Names</p>
      <p class="card-value">${uniqueNames.toLocaleString()}</p>
    </div>
    <div class="card">
      <p class="card-title">BPGUARD</p>
      <p class="card-value">${(totals['BPGUARD'] || 0).toLocaleString()}</p>
    </div>
    <div class="card">
      <p class="card-title">SGGUARD</p>
      <p class="card-value">${(totals['SGGUARD'] || 0).toLocaleString()}</p>
    </div>
    <div class="card">
      <p class="card-title">Synbiotic+ MM</p>
      <p class="card-value">${(totals['Synbiotic+ MM'] || 0).toLocaleString()}</p>
    </div>
    <div class="card">
      <p class="card-title">Silver</p>
      <p class="card-value">${(totals['Silver'] || 0).toLocaleString()}</p>
    </div>
    <div class="card">
      <p class="card-title">Gold</p>
      <p class="card-value">${(totals['Gold'] || 0).toLocaleString()}</p>
    </div>
    <div class="card">
      <p class="card-title">Platinum</p>
      <p class="card-value">${(totals['Platinum'] || 0).toLocaleString()}</p>
    </div>
  `;
}

function filterRowsByDate(rows) {
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  if (!startDate || !endDate) return rows.slice();

  const start = startDate.value ? new Date(`${startDate.value}T00:00:00`) : null;
  const end = endDate.value ? new Date(`${endDate.value}T23:59:59`) : null;

  return rows.filter((row) => {
    const dt = row.transacted_at ? new Date(row.transacted_at) : null;
    if (!dt || Number.isNaN(dt.getTime())) return false;
    if (start && dt < start) return false;
    if (end && dt > end) return false;
    return true;
  });
}

function updateImportButtonState() {
  const importBtn = document.getElementById('importBtn');
  if (!importBtn) return;
  importBtn.disabled = !parsedRows.length;
}

function showParseWarnings(rows) {
  const warningRowCount = rows.reduce((sum, row) => (row.warnings && row.warnings.length ? sum + 1 : sum), 0);
  if (warningRowCount) {
    showStatus(`Parsed ${rows.length} rows. ${warningRowCount} rows have item parsing warnings. Review via Preview Items.`, 'warn');
  } else {
    showStatus(`Parsed ${rows.length} rows successfully.`);
  }
}

async function importParsedRows() {
  if (!parsedRows.length) {
    showStatus('Nothing to import yet.', 'warn');
    return;
  }

  let supabase;
  try {
    supabase = window.getSupabase();
  } catch (err) {
    showStatus(err.message || 'Supabase config missing.', 'error');
    return;
  }

  const importBtn = document.getElementById('importBtn');
  if (importBtn) importBtn.disabled = true;

  try {
    showStatus('Creating upload record...');
    const { data: upload, error: uploadError } = await supabase
      .from('sales_uploads')
      .insert({ filename: currentFilename || 'upload.xlsx', row_count: parsedRows.length })
      .select('id')
      .single();

    if (uploadError) throw uploadError;

    const uploadId = upload.id;
    const chunkSize = 500;
    const itemChunkSize = 1000;

    let rowInsertCount = 0;

    for (let i = 0; i < parsedRows.length; i += chunkSize) {
      const chunk = parsedRows.slice(i, i + chunkSize);
      showStatus(`Uploading rows ${i + 1}-${Math.min(i + chunkSize, parsedRows.length)} of ${parsedRows.length}...`);

      const payload = chunk.map((row) => ({
        upload_id: uploadId,
        sheet_name: row.sheet_name || '',
        transacted_at: row.transacted_at,
        depot: row.depot,
        ps_code: row.ps_code,
        account_type: row.account_type,
        buyer_raw: row.buyer_raw,
        buyer_name: row.buyer_name,
        buyer_username: row.buyer_username,
        items_raw: row.items_raw,
        amount: row.amount
      }));

      const { data: insertedRows, error: rowError } = await supabase
        .from('sales_rows')
        .insert(payload)
        .select('id');

      if (rowError) throw rowError;

      rowInsertCount += insertedRows.length;

      const itemRows = [];
      insertedRows.forEach((inserted, idx) => {
        const sourceRow = chunk[idx];
        if (!sourceRow || !sourceRow.items || !sourceRow.items.length) return;
        sourceRow.items.forEach((item) => {
          itemRows.push({
            row_id: inserted.id,
            item_type: item.item_type,
            qty: item.qty
          });
        });
      });

      for (let j = 0; j < itemRows.length; j += itemChunkSize) {
        const itemsChunk = itemRows.slice(j, j + itemChunkSize);
        if (!itemsChunk.length) continue;
        showStatus(`Uploading items ${j + 1}-${Math.min(j + itemChunkSize, itemRows.length)} of ${itemRows.length}...`);

        const { error: itemError } = await supabase
          .from('sales_items')
          .insert(itemsChunk);

        if (itemError) throw itemError;
      }
    }

    showStatus(`Import complete. ${rowInsertCount} rows uploaded.`);

    parsedRows = [];
    parsedVisibleRows = [];
    previewBaseRows = [];
    updateImportButtonState();
    currentMode = 'supabase';

    await loadSupabaseRowsByDateRange();
  } catch (err) {
    console.error('Supabase import failed:', err);
    showStatus(`Import failed: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (importBtn) importBtn.disabled = !parsedRows.length;
  }
}

async function loadSupabaseRowsByDateRange() {
  let supabase;
  try {
    supabase = window.getSupabase();
  } catch (err) {
    showStatus(err.message || 'Supabase config missing.', 'error');
    return;
  }

  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  if (!startDate || !endDate) return;

  const startIso = startDate.value ? new Date(`${startDate.value}T00:00:00`).toISOString() : null;
  const endIso = endDate.value ? new Date(`${endDate.value}T23:59:59`).toISOString() : null;

  showStatus('Loading Supabase rows...');

  const query = supabase
    .from('sales_rows')
    .select('id, transacted_at, depot, ps_code, account_type, buyer_raw, buyer_name, buyer_username, items_raw, amount, sheet_name')
    .order('transacted_at', { ascending: false });

  if (startIso) query.gte('transacted_at', startIso);
  if (endIso) query.lte('transacted_at', endIso);

  const { data, error } = await query;

  if (error) {
    console.error('Supabase query failed:', error);
    showStatus(`Failed to load Supabase data: ${error.message}`, 'error');
    return;
  }

  supabaseRows = Array.isArray(data) ? data : [];
  supabaseRows.forEach((row) => {
    const warnings = Array.isArray(row.parse_warnings) ? row.parse_warnings : [];
    row.parse_warnings = warnings;
    row.has_warning = warnings.length > 0;
  });
  supabaseItemsByRowId = await fetchItemsForRows(supabaseRows.map((row) => row.id));
  supabaseBaseRows = supabaseRows.slice();
  filterState.allRows = supabaseBaseRows.slice();
  currentMode = 'supabase';

  applyFiltersAndRender();
  clearStatus();
}

async function fetchItemsForRows(rowIds) {
  const map = new Map();
  if (!rowIds.length) return map;

  const supabase = window.getSupabase();
  // Keep IN-filter query strings below URL limits (UUID lists get very long).
  const chunkSize = 120;

  for (let i = 0; i < rowIds.length; i += chunkSize) {
    const chunk = rowIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('sales_items')
      .select('row_id, item_type, qty')
      .in('row_id', chunk);

    if (error) {
      console.error('Failed to load items:', error);
      continue;
    }

    (data || []).forEach((item) => {
      const mapKey = getRowMapKey(item.row_id);
      if (!map.has(mapKey)) {
        map.set(mapKey, []);
      }
      map.get(mapKey).push({
        item_type: item.item_type,
        qty: item.qty
      });
    });
  }

  return map;
}

async function ensureSupabaseItemsForRow(rowId) {
  const mapKey = getRowMapKey(rowId);
  if (supabaseItemsByRowId.has(mapKey)) {
    return supabaseItemsByRowId.get(mapKey);
  }

  const supabase = window.getSupabase();
  const { data, error } = await supabase
    .from('sales_items')
    .select('row_id, item_type, qty')
    .eq('row_id', rowId);

  if (error) {
    console.error('Failed to load items for row:', error);
    return [];
  }

  const items = (data || []).map((item) => ({
    item_type: item.item_type,
    qty: item.qty
  }));

  supabaseItemsByRowId.set(mapKey, items);
  return items;
}

function initModalControls() {
  const modal = document.getElementById('itemsModal');
  const closeBtn = document.getElementById('itemsModalClose');
  const okBtn = document.getElementById('itemsModalOk');
  const backdrop = modal ? modal.querySelector('.modal__backdrop') : null;

  const close = () => closeItemsModal();

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (okBtn) okBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
}

function openItemsModal(row, items, warnings) {
  const modal = document.getElementById('itemsModal');
  const title = document.getElementById('itemsModalTitle');
  const meta = document.getElementById('itemsModalMeta');
  const warningsEl = document.getElementById('itemsModalWarnings');
  const list = document.getElementById('itemsModalList');

  if (!modal || !title || !meta || !warningsEl || !list) return;

  title.textContent = `Items Preview - ${row.buyer_name || 'Unknown'} (${row.ps_code || 'N/A'})`;

  const dt = row.transacted_at ? new Date(row.transacted_at) : null;
  const dtText = dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleString() : '';

  meta.innerHTML = `
    <p><strong>Transacted:</strong> ${dtText}</p>
    <p><strong>Depot:</strong> ${row.depot || ''}</p>
    <p><strong>Sheet:</strong> ${row.sheet_name || ''}</p>
    <p><strong>Buyer Raw:</strong> ${row.buyer_raw || ''}</p>
    <p><strong>Username:</strong> ${row.buyer_username || ''}</p>
    <p><strong>Items Raw:</strong> ${row.items_raw || ''}</p>
  `;

  if (warnings && warnings.length) {
    warningsEl.textContent = warnings.join(' | ');
    warningsEl.classList.remove('hidden');
  } else {
    warningsEl.textContent = '';
    warningsEl.classList.add('hidden');
  }

  if (!items || !items.length) {
    list.innerHTML = '<div class="empty-state">No parsed items.</div>';
  } else {
    const ul = document.createElement('ul');
    ul.style.margin = '0';
    ul.style.paddingLeft = '18px';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = `${item.item_type} x ${item.qty}`;
      ul.appendChild(li);
    });
    list.innerHTML = '';
    list.appendChild(ul);
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeItemsModal() {
  const modal = document.getElementById('itemsModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function updateWarningsBadge(rows) {
  const badge = document.getElementById('warningsCountBadge');
  if (!badge) return;
  const warningsCount = rows.reduce((sum, row) => (
    row.has_warning === true || (row.parse_warnings && row.parse_warnings.length > 0)
      ? sum + 1
      : sum
  ), 0);
  badge.textContent = `Warnings: ${warningsCount}`;
  badge.style.display = warningsCount > 0 ? 'inline-flex' : 'none';
}

window.initSupabaseSalesUpload = initSupabaseSalesUpload;
