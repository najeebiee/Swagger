// UNILEVEL UPLINE CONFIG
const UNILEVEL_UPLINE_API_USER = 'ggitteam';
const UNILEVEL_UPLINE_ENDPOINT = '/api/unilevelUpline';

const unilevelUplineColumns = [
  { key: 'idno',         label: 'ID NO' },
  { key: 'registered',   label: 'REGISTERED' },
  { key: 'user_name',    label: 'USER NAME' },
  { key: 'user',         label: 'USER' },
  { key: 'account_type', label: 'ACCOUNT TYPE' },
  { key: 'payment',      label: 'PAYMENT' }
];

let unilevelUplineAllRows = [];
let unilevelUplineVisibleRows = [];

function getUnilevelUplineApiKey() {
  return generateApiKey(); // same helper as other pages
}

// SUMMARY
function renderUnilevelUplineSummary(rows, summaryEl) {
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
function renderUnilevelUplineTable(rows) {
  const tableContainer = document.getElementById('unilevel-upline-table-container');

  renderTable(tableContainer, unilevelUplineColumns, rows);
}

// DATA LOADING – always call the API (like your "proper" user upline)
async function loadUnilevelUplineData({ username }) {
  const tableContainer = document.getElementById('unilevel-upline-table-container');
  const summaryEl      = document.getElementById('unilevel-upline-summary');

  if (tableContainer) {
    tableContainer.innerHTML =
      '<div class="empty-state">Loading unilevel upline data...</div>';
  }

  try {
    const params = {
      user:   UNILEVEL_UPLINE_API_USER,
      apikey: getUnilevelUplineApiKey()
    };

    // Only send username if specified – backend turns it into accounthash
    if (username) {
      params.username = username;
    }

    const result = await apiGet(UNILEVEL_UPLINE_ENDPOINT, params);

    // Robust shape handling: { data: [...] } OR plain [...]
    const rows = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    if (!rows.length) {
      console.warn('No unilevel upline data found for username:', username || '(root)');
    }

    unilevelUplineAllRows = rows;
    unilevelUplineVisibleRows = rows;
    renderUnilevelUplineSummary(unilevelUplineVisibleRows, summaryEl);
    renderUnilevelUplineTable(unilevelUplineVisibleRows);
    return rows;
  } catch (error) {
    console.error('Failed to load unilevel upline data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the unilevel upline data. Please try again.</div>';
    }
    if (summaryEl) summaryEl.innerHTML = '';
    return [];
  }
}

// PAGE INIT
function initUnilevelUplinePage() {
  const usernameInput = document.getElementById('unilevel-upline-username');
  const filterForm    = document.getElementById('unilevel-upline-filter-form');
  const tableSearchInput = document.getElementById('unilevel-upline-table-search');
  const exportCsvBtn = document.getElementById('unilevel-upline-export-csv');
  const exportXlsxBtn = document.getElementById('unilevel-upline-export-xlsx');
  const exportPdfBtn = document.getElementById('unilevel-upline-export-pdf');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadUnilevelUplineData({ username });
    });
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', applyUnilevelUplineTableSearch);
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      confirmExport('csv', () => {
        window.exportRowsToCsv(
          unilevelUplineColumns,
          unilevelUplineVisibleRows,
          'unilevel-upline.csv'
        );
        showExportSuccess('csv');
      });
    });
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      confirmExport('xlsx', () => {
        window.exportRowsToXlsx(
          unilevelUplineColumns,
          unilevelUplineVisibleRows,
          'unilevel-upline.xlsx'
        );
        showExportSuccess('xlsx');
      });
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      window.exportTableToPdf(
        unilevelUplineColumns,
        unilevelUplineVisibleRows,
        'Unilevel Upline'
      );
    });
  }

  // Initial load with NO username → backend uses ROOT_UPLINE_HASH
  loadUnilevelUplineData({ username: '' });
}

function applyUnilevelUplineTableSearch() {
  const input = document.getElementById('unilevel-upline-table-search');
  const term = input ? input.value.trim().toLowerCase() : '';

  if (!term) {
    unilevelUplineVisibleRows = unilevelUplineAllRows.slice();
  } else {
    unilevelUplineVisibleRows = unilevelUplineAllRows.filter((row) =>
      unilevelUplineColumns.some((col) => {
        const value = row[col.key];
        return value && String(value).toLowerCase().includes(term);
      })
    );
  }

  renderUnilevelUplineTable(unilevelUplineVisibleRows);
  const summaryEl = document.getElementById('unilevel-upline-summary');
  if (summaryEl) {
    renderUnilevelUplineSummary(unilevelUplineVisibleRows, summaryEl);
  }
}

window.loadUnilevelUplineData = loadUnilevelUplineData;
window.initUnilevelUplinePage = initUnilevelUplinePage;
