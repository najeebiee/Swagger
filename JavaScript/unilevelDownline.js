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

let unilevelDownlineAllRows = [];
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

// DATA LOADING – always call the API (like your "proper" user upline)
async function loadUnilevelDownlineData({ username }) {
  const tableContainer = document.getElementById('unilevel-downline-table-container');
  const summaryEl      = document.getElementById('unilevel-downline-summary');

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

    unilevelDownlineAllRows = rows;
    unilevelDownlineVisibleRows = rows;
    renderUnilevelDownlineSummary(unilevelDownlineVisibleRows, summaryEl);
    renderUnilevelDownlineTable(unilevelDownlineVisibleRows);
    return rows;
  } catch (error) {
    console.error('Failed to load unilevel downline data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the unilevel downline data. Please try again.</div>';
    }
    if (summaryEl) summaryEl.innerHTML = '';
    return [];
  }
}

// PAGE INIT
function initUnilevelDownlinePage() {
  const usernameInput = document.getElementById('unilevel-downline-username');
  const filterForm    = document.getElementById('unilevel-downline-filter-form');
  const tableSearchInput = document.getElementById('unilevel-downline-table-search');
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
  const term = input ? input.value.trim().toLowerCase() : '';

  if (!term) {
    unilevelDownlineVisibleRows = unilevelDownlineAllRows.slice();
  } else {
    unilevelDownlineVisibleRows = unilevelDownlineAllRows.filter((row) =>
      unilevelDownlineColumns.some((col) => {
        const value = row[col.key];
        return value && String(value).toLowerCase().includes(term);
      })
    );
  }

  renderUnilevelDownlineTable(unilevelDownlineVisibleRows);
  const summaryEl = document.getElementById('unilevel-downline-summary');
  if (summaryEl) {
    renderUnilevelDownlineSummary(unilevelDownlineVisibleRows, summaryEl);
  }
}

window.loadUnilevelDownlineData = loadUnilevelDownlineData;
window.initUnilevelDownlinePage = initUnilevelDownlinePage;
