// SPONSORED DOWNLINE CONFIG
const SPONSORED_DOWNLINE_API_USER = 'ggitteam';
const SPONSORED_DOWNLINE_ENDPOINT = '/api/sponsoredDownline';

const sponsoredDownlineColumns = [
  { key: 'idno',         label: 'ID NO' },
  { key: 'registered',   label: 'REGISTERED' },
  { key: 'user_name',    label: 'USER NAME' },
  { key: 'user',         label: 'USER' },
  { key: 'account_type', label: 'ACCOUNT TYPE' },
  { key: 'payment',      label: 'PAYMENT' }
];

let sponsoredDownlineCachedRows = [];
let sponsoredDownlineVisibleRows = [];

function getSponsoredDownlineApiKey() {
  return generateApiKey(); // same helper as other pages
}

// SUMMARY
function renderSponsoredDownlineSummary(rows, summaryEl) {
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
function renderSponsoredDownlineTable(rows) {
  const tableContainer = document.getElementById('sponsored-downline-table-container');

  renderTable(tableContainer, sponsoredDownlineColumns, rows);
}

function applySponsoredDownlineVisibleRows(visibleRows) {
  sponsoredDownlineVisibleRows = Array.isArray(visibleRows) ? visibleRows : [];

  const summaryEl = document.getElementById('sponsored-downline-summary');

  renderSponsoredDownlineSummary(sponsoredDownlineVisibleRows, summaryEl);
  renderSponsoredDownlineTable(sponsoredDownlineVisibleRows);
}

function filterSponsoredDownlineRows(rows, term) {
  if (!term) return rows.slice();

  const lowered = term.toLowerCase();

  return rows.filter((row) =>
    sponsoredDownlineColumns.some((col) =>
      String(row[col.key] ?? '').toLowerCase().includes(lowered)
    )
  );
}

// DATA LOADING – always call the API (like your "proper" user upline)
async function loadSponsoredDownlineData({ username }) {
  const tableContainer = document.getElementById('sponsored-downline-table-container');
  const tableSearchInput = document.getElementById('sponsored-downline-table-search');
  const tableSearchClear = document.getElementById('sponsored-downline-table-search-clear');

  if (tableContainer) {
    tableContainer.innerHTML =
      '<div class="empty-state">Loading sponsored downline data...</div>';
  }

  try {
    const params = {
      user:   SPONSORED_DOWNLINE_API_USER,
      apikey: getSponsoredDownlineApiKey()
    };

    // Only send username if specified – backend turns it into accounthash
    if (username) {
      params.username = username;
    }

    const result = await apiGet(SPONSORED_DOWNLINE_ENDPOINT, params);

    // Robust shape handling: { data: [...] } OR plain [...]
    const rows = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    if (!rows.length) {
      console.warn('No sponsored downline data found for username:', username || '(root)');
    }

    sponsoredDownlineCachedRows = rows;
    if (tableSearchInput) tableSearchInput.value = '';
    if (tableSearchClear) tableSearchClear.disabled = true;

    applySponsoredDownlineVisibleRows(sponsoredDownlineCachedRows);
    return rows;
  } catch (error) {
    console.error('Failed to load sponsored downline data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the sponsored downline data. Please try again.</div>';
    }
    applySponsoredDownlineVisibleRows([]);
    return [];
  }
}

// PAGE INIT
function initSponsoredDownlinePage() {
  const usernameInput = document.getElementById('sponsored-downline-username');
  const filterForm    = document.getElementById('sponsored-downline-filter-form');
  const tableSearchInput = document.getElementById('sponsored-downline-table-search');
  const tableSearchClear = document.getElementById('sponsored-downline-table-search-clear');
  const exportCsvBtn = document.getElementById('sponsored-downline-export-csv');
  const exportXlsxBtn = document.getElementById('sponsored-downline-export-xlsx');
  const exportPdfBtn = document.getElementById('sponsored-downline-export-pdf');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadSponsoredDownlineData({ username });
    });
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', applySponsoredDownlineTableSearch);
  }

  if (tableSearchClear) {
    tableSearchClear.addEventListener('click', (event) => {
      event.preventDefault();
      if (tableSearchInput) tableSearchInput.value = '';
      tableSearchClear.disabled = true;
      applySponsoredDownlineVisibleRows(sponsoredDownlineCachedRows);
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      confirmExport('csv', () => {
        exportRowsToCsv(
          sponsoredDownlineColumns,
          sponsoredDownlineVisibleRows,
          'sponsored-downline.csv'
        );
        showExportSuccess('csv');
      });
    });
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      confirmExport('xlsx', () => {
        exportRowsToXlsx(
          sponsoredDownlineColumns,
          sponsoredDownlineVisibleRows,
          'sponsored-downline.xlsx'
        );
        showExportSuccess('xlsx');
      });
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      exportTableToPdf(
        sponsoredDownlineColumns,
        sponsoredDownlineVisibleRows,
        'Sponsored Downline'
      );
    });
  }

  // Initial load with NO username → backend uses ROOT_DOWNLINE_HASH
  loadSponsoredDownlineData({ username: '' });
}

function applySponsoredDownlineTableSearch() {
  const input = document.getElementById('sponsored-downline-table-search');
  const clearBtn = document.getElementById('sponsored-downline-table-search-clear');
  if (!input) return;

  const term = input.value.trim();

  if (clearBtn) {
    clearBtn.disabled = !term;
  }

  const filteredRows = filterSponsoredDownlineRows(sponsoredDownlineCachedRows, term);

  applySponsoredDownlineVisibleRows(filteredRows);
}

window.loadSponsoredDownlineData = loadSponsoredDownlineData;
window.initSponsoredDownlinePage = initSponsoredDownlinePage;
