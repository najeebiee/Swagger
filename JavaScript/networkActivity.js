// NETWORK ACTIVITY CONFIG
const NETWORK_ACTIVITY_API_USER = 'ggitteam';
const NETWORK_ACTIVITY_ENDPOINT = '/api/networkActivity';

const networkActivityColumns = [
  { key: 'requestdate',   label: 'REQUEST DATE' },
  { key: 'amount',        label: 'AMOUNT' },
  { key: 'remarks',       label: 'REMARKS' }
];

let networkActivityAllRows = [];
let networkActivityVisibleRows = [];

function getNetworkActivityApiKey() {
  return generateApiKey(); // same helper as other pages
}

// SUMMARY
function renderNetworkActivitySummary(rows, summaryEl) {
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
function renderNetworkActivityTable(rows) {
  const tableContainer = document.getElementById('network-activity-table-container');

  renderTable(tableContainer, networkActivityColumns, rows);
}

// DATA LOADING – always call the API (like your "proper" user upline)
async function loadNetworkActivityData({ username }) {
  const tableContainer = document.getElementById('network-activity-table-container');
  const summaryEl      = document.getElementById('network-activity-summary');

  if (tableContainer) {
    tableContainer.innerHTML =
      '<div class="empty-state">Loading network activity data...</div>';
  }

  try {
    const params = {
      user:   NETWORK_ACTIVITY_API_USER,
      apikey: getNetworkActivityApiKey()
    };

    // Only send username if specified – backend turns it into accounthash
    if (username) {
      params.username = username;
    }

    const result = await apiGet(NETWORK_ACTIVITY_ENDPOINT, params);

    // Robust shape handling: { data: [...] } OR plain [...]
    const rows = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    if (!rows.length) {
      console.warn('No network activity data found for username:', username || '(root)');
    }

    networkActivityAllRows = rows;
    networkActivityVisibleRows = rows;
    renderNetworkActivitySummary(networkActivityVisibleRows, summaryEl);
    renderNetworkActivityTable(networkActivityVisibleRows);
    return rows;
  } catch (error) {
    console.error('Failed to load network activity data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the network activity data. Please try again.</div>';
    }
    if (summaryEl) summaryEl.innerHTML = '';
    return [];
  }
}

// PAGE INIT
function initNetworkActivityPage() {
  const usernameInput = document.getElementById('network-activity-username');
  const filterForm    = document.getElementById('network-activity-filter-form');
  const tableSearchInput = document.getElementById('network-activity-table-search');
  const exportCsvBtn = document.getElementById('network-activity-export-csv');
  const exportXlsxBtn = document.getElementById('network-activity-export-xlsx');
  const exportPdfBtn = document.getElementById('network-activity-export-pdf');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadNetworkActivityData({ username });
    });
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', applyNetworkActivityTableSearch);
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      confirmExport('csv', () => {
        window.exportRowsToCsv(
          networkActivityColumns,
          networkActivityVisibleRows,
          'network-activity.csv'
        );
        showExportSuccess('csv');
      });
    });
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      confirmExport('xlsx', () => {
        window.exportRowsToXlsx(
          networkActivityColumns,
          networkActivityVisibleRows,
          'network-activity.xlsx'
        );
        showExportSuccess('xlsx');
      });
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      window.exportTableToPdf(
        networkActivityColumns,
        networkActivityVisibleRows,
        'Network Activity'
      );
    });
  }

  // Initial load with NO username → backend uses ROOT_DOWNLINE_HASH
  loadNetworkActivityData({ username: '' });
}

function applyNetworkActivityTableSearch() {
  const input = document.getElementById('network-activity-table-search');
  const term = input ? input.value.trim().toLowerCase() : '';

  if (!term) {
    networkActivityVisibleRows = networkActivityAllRows.slice();
  } else {
    networkActivityVisibleRows = networkActivityAllRows.filter((row) =>
      networkActivityColumns.some((col) => {
        const value = row[col.key];
        return value && String(value).toLowerCase().includes(term);
      })
    );
  }

  renderNetworkActivityTable(networkActivityVisibleRows);
  const summaryEl = document.getElementById('network-activity-summary');
  if (summaryEl) {
    renderNetworkActivitySummary(networkActivityVisibleRows, summaryEl);
  }
}

window.loadNetworkActivityData = loadNetworkActivityData;
window.initNetworkActivityPage = initNetworkActivityPage;
