// BINARY DOWNLINE CONFIG
const BINARY_DOWNLINE_API_USER = 'ggitteam';
const BINARY_DOWNLINE_ENDPOINT = '/api/binaryDownline';

const binaryDownlineColumns = [
  { key: 'idno',              label: 'ID NO' },
  { key: 'registered',        label: 'REGISTERED' },
  { key: 'user_name',         label: 'USER NAME' },
  { key: 'user',              label: 'USER' },
  { key: 'placement',         label: 'PLACEMENT' },
  { key: 'placement_group',   label: 'PLACEMENT GROUP' },
  { key: 'account_type',      label: 'ACCOUNT TYPE' },
  { key: 'payment',           label: 'PAYMENT' }
];

let binaryDownlineCachedRows = [];
let binaryDownlineVisibleRows = [];

function getBinaryDownlineApiKey() {
  return generateApiKey(); // same helper as other pages
}

// SUMMARY
function renderBinaryDownlineSummary(rows, summaryEl) {
  if (!summaryEl) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    summaryEl.innerHTML = '';
    return;
  }

  const totalUsers = rows.length;

  summaryEl.innerHTML = `
    <div class="card-grid">
      <div class="card">
        <p class="card-title">Total Nodes</p>
        <p class="card-value">${totalUsers.toLocaleString()}</p>
      </div>
    </div>
  `;
}

// TABLE (uses shared renderTable from common.js)
function renderBinaryDownlineTable(rows) {
  const tableContainer = document.getElementById('binary-downline-table-container');

  renderTable(tableContainer, binaryDownlineColumns, rows);
}

function applyBinaryDownlineVisibleRows(visibleRows) {
  binaryDownlineVisibleRows = Array.isArray(visibleRows) ? visibleRows : [];

  const summaryEl = document.getElementById('binary-downline-summary');

  renderBinaryDownlineSummary(binaryDownlineVisibleRows, summaryEl);
  renderBinaryDownlineTable(binaryDownlineVisibleRows);
}

function filterBinaryDownlineRows(rows, term) {
  if (!term) return rows.slice();

  const lowered = term.toLowerCase();

  return rows.filter((row) =>
    binaryDownlineColumns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(lowered))
  );
}

// DATA LOADING – always call the API (like your "proper" user upline)
async function loadBinaryDownlineData({ username }) {
  const tableContainer = document.getElementById('binary-downline-table-container');
  const tableSearchInput = document.getElementById('binary-downline-table-search');
  const tableSearchClear = document.getElementById('binary-downline-table-search-clear');

  if (tableContainer) {
    tableContainer.innerHTML =
      '<div class="empty-state">Loading binary downline data...</div>';
  }

  try {
    const params = {
      user:   BINARY_DOWNLINE_API_USER,
      apikey: getBinaryDownlineApiKey()
    };

    // Only send username if specified – backend turns it into accounthash
    if (username) {
      params.username = username;
    }

    const result = await apiGet(BINARY_DOWNLINE_ENDPOINT, params);

    // Robust shape handling: { data: [...] } OR plain [...]
    const rows = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    if (!rows.length) {
      console.warn('No binary downline data found for username:', username || '(root)');
    }

    binaryDownlineCachedRows = rows;
    if (tableSearchInput) tableSearchInput.value = '';
    if (tableSearchClear) tableSearchClear.disabled = true;

    applyBinaryDownlineVisibleRows(binaryDownlineCachedRows);
    return rows;
  } catch (error) {
    console.error('Failed to load binary downline data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the binary downline data. Please try again.</div>';
    }
    applyBinaryDownlineVisibleRows([]);
    return [];
  }
}

// PAGE INIT
function initBinaryDownlinePage() {
  const usernameInput = document.getElementById('binary-downline-username');
  const filterForm    = document.getElementById('binary-downline-filter-form');
  const tableSearchInput = document.getElementById('binary-downline-table-search');
  const tableSearchClear = document.getElementById('binary-downline-table-search-clear');
  const exportCsvBtn = document.getElementById('binary-downline-export-csv');
  const exportXlsxBtn = document.getElementById('binary-downline-export-xlsx');
  const exportPdfBtn = document.getElementById('binary-downline-export-pdf');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadBinaryDownlineData({ username });
    });
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', applyBinaryDownlineTableSearch);
  }

  if (tableSearchClear) {
    tableSearchClear.addEventListener('click', (event) => {
      event.preventDefault();
      if (tableSearchInput) tableSearchInput.value = '';
      tableSearchClear.disabled = true;
      applyBinaryDownlineVisibleRows(binaryDownlineCachedRows);
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      confirmExport('csv', () => {
        exportRowsToCsv(binaryDownlineColumns, binaryDownlineVisibleRows, 'binary-downline.csv');
        showExportSuccess('csv');
      });
    });
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      confirmExport('xlsx', () => {
        exportRowsToXlsx(binaryDownlineColumns, binaryDownlineVisibleRows, 'binary-downline.xlsx');
        showExportSuccess('xlsx');
      });
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      exportTableToPdf(binaryDownlineColumns, binaryDownlineVisibleRows, 'Binary Downline');
    });
  }

  // Initial load with NO username → backend uses ROOT_DOWNLINE_HASH
  loadBinaryDownlineData({ username: '' });
}

function applyBinaryDownlineTableSearch() {
  const input = document.getElementById('binary-downline-table-search');
  const clearBtn = document.getElementById('binary-downline-table-search-clear');
  if (!input) return;

  const term = input.value.trim();

  if (clearBtn) {
    clearBtn.disabled = !term;
  }

  const filteredRows = filterBinaryDownlineRows(binaryDownlineCachedRows, term);

  applyBinaryDownlineVisibleRows(filteredRows);
}

window.loadBinaryDownlineData = loadBinaryDownlineData;
window.initBinaryDownlinePage = initBinaryDownlinePage;
