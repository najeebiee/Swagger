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

let binaryDownlineAllRows = [];
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

// DATA LOADING – always call the API (like your "proper" user upline)
async function loadBinaryDownlineData({ username }) {
  const tableContainer = document.getElementById('binary-downline-table-container');
  const summaryEl      = document.getElementById('binary-downline-summary');

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

    binaryDownlineAllRows = rows;
    binaryDownlineVisibleRows = rows;
    renderBinaryDownlineSummary(binaryDownlineVisibleRows, summaryEl);
    renderBinaryDownlineTable(binaryDownlineVisibleRows);
    return rows;
  } catch (error) {
    console.error('Failed to load binary downline data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the binary downline data. Please try again.</div>';
    }
    if (summaryEl) summaryEl.innerHTML = '';
    return [];
  }
}

// PAGE INIT
function initBinaryDownlinePage() {
  const usernameInput = document.getElementById('binary-downline-username');
  const filterForm    = document.getElementById('binary-downline-filter-form');
  const tableSearchInput = document.getElementById('binary-downline-table-search');
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
  const summaryEl = document.getElementById('binary-downline-summary');
  const input = document.getElementById('binary-downline-table-search');
  if (!input) return;

  const term = input.value.trim().toLowerCase();

  if (!term) {
    binaryDownlineVisibleRows = binaryDownlineAllRows.slice();
  } else {
    binaryDownlineVisibleRows = binaryDownlineAllRows.filter((row) =>
      binaryDownlineColumns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(term))
    );
  }

  renderBinaryDownlineSummary(binaryDownlineVisibleRows, summaryEl);
  renderBinaryDownlineTable(binaryDownlineVisibleRows);
}

window.loadBinaryDownlineData = loadBinaryDownlineData;
window.initBinaryDownlinePage = initBinaryDownlinePage;
