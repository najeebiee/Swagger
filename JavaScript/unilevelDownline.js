// UNILEVEL DOWNLINE CONFIG
const UNILEVEL_DOWNLINE_API_USER = 'ggitteam';
const UNILEVEL_DOWNLINE_ENDPOINT = '/api/unilevelDownline';

const unilevelDownlineColumns = [
  { key: 'idno',         label: 'ID NO' },
  { key: 'registered',   label: 'REGISTERED' },
  { key: 'user_name',    label: 'USER NAME' },
  { key: 'user',         label: 'USER' },
  { key: 'account_type', label: 'ACCOUNT TYPE' },
  { key: 'payment',      label: 'PAYMENT' }
];

let unilevelDownlineCachedRows = [];
let unilevelDownlineVisibleRows = [];

function getUnilevelDownlineApiKey() {
  return generateApiKey(); // same helper as other pages
}

// SUMMARY
function renderUnilevelDownlineSummary(rows, summaryEl) {
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
function renderUnilevelDownlineTable(rows) {
  const tableContainer = document.getElementById('unilevel-downline-table-container');

  renderTable(tableContainer, unilevelDownlineColumns, rows);
}

function applyUnilevelDownlineVisibleRows(visibleRows) {
  unilevelDownlineVisibleRows = Array.isArray(visibleRows) ? visibleRows : [];

  const summaryEl = document.getElementById('unilevel-downline-summary');

  renderUnilevelDownlineTable(unilevelDownlineVisibleRows);
  if (summaryEl) {
    renderUnilevelDownlineSummary(unilevelDownlineVisibleRows, summaryEl);
  }
}

function filterUnilevelDownlineRows(rows, term) {
  if (!term) return rows.slice();

  const lowered = term.toLowerCase();

  return rows.filter((row) =>
    unilevelDownlineColumns.some((col) => {
      const value = row[col.key];
      return value && String(value).toLowerCase().includes(lowered);
    })
  );
}

// DATA LOADING – always call the API (like your "proper" user upline)
async function loadUnilevelDownlineData({ username }) {
  const tableContainer = document.getElementById('unilevel-downline-table-container');
  const tableSearchInput = document.getElementById('unilevel-downline-table-search');
  const tableSearchClear = document.getElementById('unilevel-downline-table-search-clear');

  if (tableContainer) {
    tableContainer.innerHTML =
      '<div class="empty-state">Loading unilevel downline data...</div>';
  }

  try {
    const params = {
      user:   UNILEVEL_DOWNLINE_API_USER,
      apikey: getUnilevelDownlineApiKey()
    };

    // Only send username if specified – backend turns it into accounthash
    if (username) {
      params.username = username;
    }

    const result = await apiGet(UNILEVEL_DOWNLINE_ENDPOINT, params);

    // Robust shape handling: { data: [...] } OR plain [...]
    const rows = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    if (!rows.length) {
      console.warn('No unilevel downline data found for username:', username || '(root)');
    }

    unilevelDownlineCachedRows = rows;
    if (tableSearchInput) tableSearchInput.value = '';
    if (tableSearchClear) tableSearchClear.disabled = true;
    applyUnilevelDownlineVisibleRows(unilevelDownlineCachedRows);
    return rows;
  } catch (error) {
    console.error('Failed to load unilevel downline data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the unilevel downline data. Please try again.</div>';
    }
    applyUnilevelDownlineVisibleRows([]);
    return [];
  }
}

// PAGE INIT
function initUnilevelDownlinePage() {
  const usernameInput = document.getElementById('unilevel-downline-username');
  const filterForm    = document.getElementById('unilevel-downline-filter-form');
  const tableSearchInput = document.getElementById('unilevel-downline-table-search');
  const tableSearchClear = document.getElementById('unilevel-downline-table-search-clear');
  const exportCsvBtn = document.getElementById('unilevel-downline-export-csv');
  const exportXlsxBtn = document.getElementById('unilevel-downline-export-xlsx');
  const exportPdfBtn = document.getElementById('unilevel-downline-export-pdf');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadUnilevelDownlineData({ username });
    });
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', applyUnilevelDownlineTableSearch);
  }

  if (tableSearchClear) {
    tableSearchClear.addEventListener('click', (event) => {
      event.preventDefault();
      if (tableSearchInput) tableSearchInput.value = '';
      tableSearchClear.disabled = true;
      applyUnilevelDownlineVisibleRows(unilevelDownlineCachedRows);
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      confirmExport('csv', () => {
        window.exportRowsToCsv(
          unilevelDownlineColumns,
          unilevelDownlineVisibleRows,
          'unilevel-downline.csv'
        );
        showExportSuccess('csv');
      });
    });
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      confirmExport('xlsx', () => {
        window.exportRowsToXlsx(
          unilevelDownlineColumns,
          unilevelDownlineVisibleRows,
          'unilevel-downline.xlsx'
        );
        showExportSuccess('xlsx');
      });
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      window.exportTableToPdf(
        unilevelDownlineColumns,
        unilevelDownlineVisibleRows,
        'Unilevel Downline'
      );
    });
  }

  // Initial load with NO username → backend uses ROOT_DOWNLINE_HASH
  loadUnilevelDownlineData({ username: '' });
}

function applyUnilevelDownlineTableSearch() {
  const input = document.getElementById('unilevel-downline-table-search');
  const clearBtn = document.getElementById('unilevel-downline-table-search-clear');
  const term = input ? input.value.trim() : '';

  if (clearBtn) {
    clearBtn.disabled = !term;
  }

  const filteredRows = filterUnilevelDownlineRows(unilevelDownlineCachedRows, term);

  applyUnilevelDownlineVisibleRows(filteredRows);
}

window.loadUnilevelDownlineData = loadUnilevelDownlineData;
window.initUnilevelDownlinePage = initUnilevelDownlinePage;
