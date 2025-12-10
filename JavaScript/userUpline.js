// USER UPLINE CONFIG
const USER_UPLINE_API_USER = 'ggitteam';
const USER_UPLINE_ENDPOINT = '/api/userUpline';

const userUplineColumns = [
  { key: 'lvl',       label: 'LEVEL' },
  { key: 'idno',      label: 'ID NO' },
  { key: 'user_name', label: 'USER NAME' },
  { key: 'user',      label: 'USER' },
  { key: 'placement', label: 'PLACEMENT' }
];

let userUplineCachedRows = [];
let userUplineVisibleRows = [];

function getUserUplineApiKey() {
  return generateApiKey(); // same helper as other pages
}

// SUMMARY
function renderUserUplineSummary(rows, summaryEl) {
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

// TABLE WRAPPER (uses shared renderTable from common.js)
function renderUserUplineTable(rows) {
  const tableContainer = document.getElementById('user-upline-table-container');

  renderTable(tableContainer, userUplineColumns, rows);
}

function applyUserUplineVisibleRows(visibleRows) {
  userUplineVisibleRows = Array.isArray(visibleRows) ? visibleRows : [];

  const summaryEl = document.getElementById('user-upline-summary');

  renderUserUplineSummary(userUplineVisibleRows, summaryEl);
  renderUserUplineTable(userUplineVisibleRows);
}

function filterUserUplineRows(rows, term) {
  if (!term) return rows.slice();

  const lowered = term.toLowerCase();

  return rows.filter((row) =>
    userUplineColumns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(lowered))
  );
}

/**
 * Load data:
 * - If reloadFromServer = true → call API (root hash on backend), cache rows
 * - If reloadFromServer = false & username provided → just filter cached rows
 */
async function loadUserUplineData({ username }) {
  const tableContainer = document.getElementById('user-upline-table-container');
  const tableSearchInput = document.getElementById('user-upline-table-search');
  const tableSearchClear = document.getElementById('user-upline-table-search-clear');

  if (tableContainer) {
    tableContainer.innerHTML =
      '<div class="empty-state">Loading user upline data...</div>';
  }

  try {
    const params = {
      user:   USER_UPLINE_API_USER,
      apikey: getUserUplineApiKey()
    };

    // Only send username if there is one; otherwise backend uses ROOT_UPLINE_HASH
    if (username) {
      params.username = username;
    }

    const result = await apiGet(USER_UPLINE_ENDPOINT, params);

    const rows = Array.isArray(result?.data) ? result.data : [];

    if (!rows.length) {
      console.warn('No user upline data found for username:', username || '(root)');
    }

    userUplineCachedRows = rows;
    if (tableSearchInput) tableSearchInput.value = '';
    if (tableSearchClear) tableSearchClear.disabled = true;

    applyUserUplineVisibleRows(userUplineCachedRows);
    return rows;
  } catch (error) {
    console.error('Failed to load user upline data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the user upline data. Please try again.</div>';
    }
    applyUserUplineVisibleRows([]);
    return [];
  }
}


// PAGE INIT
function initUserUplinePage() {
  const usernameInput = document.getElementById('user-upline-username');
  const filterForm    = document.getElementById('user-upline-filter-form');
  const tableSearchInput = document.getElementById('user-upline-table-search');
  const tableSearchClear = document.getElementById('user-upline-table-search-clear');
  const exportCsvBtn = document.getElementById('user-upline-export-csv');
  const exportXlsxBtn = document.getElementById('user-upline-export-xlsx');
  const exportPdfBtn = document.getElementById('user-upline-export-pdf');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadUserUplineData({ username });
    });
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', applyUserUplineTableSearch);
  }

  if (tableSearchClear) {
    tableSearchClear.addEventListener('click', (event) => {
      event.preventDefault();
      if (tableSearchInput) tableSearchInput.value = '';
      tableSearchClear.disabled = true;
      applyUserUplineVisibleRows(userUplineCachedRows);
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      confirmExport('csv', () => {
        exportRowsToCsv(userUplineColumns, userUplineVisibleRows, 'user-upline.csv');
        showExportSuccess('csv');
      });
    });
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      confirmExport('xlsx', () => {
        exportRowsToXlsx(userUplineColumns, userUplineVisibleRows, 'user-upline.xlsx');
        showExportSuccess('xlsx');
      });
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      exportTableToPdf(userUplineColumns, userUplineVisibleRows, 'User Upline');
    });
  }

  // Initial load with NO username → backend uses ROOT_UPLINE_HASH
  loadUserUplineData({ username: '' });
}

function applyUserUplineTableSearch() {
  const input = document.getElementById('user-upline-table-search');
  const clearBtn = document.getElementById('user-upline-table-search-clear');
  if (!input) return;

  const term = input.value.trim();

  if (clearBtn) {
    clearBtn.disabled = !term;
  }

  const filteredRows = filterUserUplineRows(userUplineCachedRows, term);

  applyUserUplineVisibleRows(filteredRows);
}


window.loadUserUplineData = loadUserUplineData;
window.initUserUplinePage = initUserUplinePage;
