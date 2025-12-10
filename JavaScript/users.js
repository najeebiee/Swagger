// USERS CONFIG
const USERS_API_USER = 'ggitteam';
const USERS_ENDPOINT = '/api/users';

const userColumns = [
  { key: 'user_name',    label: 'Username' },
  { key: 'name',         label: 'Name' },
  { key: 'sponsored',    label: 'Sponsored By' },
  { key: 'placement',    label: 'Placement' },
  { key: 'group',        label: 'Group' },
  { key: 'account_type', label: 'Account Type' },
  { key: 'date_created', label: 'Date Created' },
  { key: 'region',       label: 'Region' },
  { key: 'province',     label: 'Province' },
  { key: 'city',         label: 'City' },
  { key: 'brgy',         label: 'Barangay' },
  { key: 'status',       label: 'Status' }
];

let usersCachedRows = [];
let usersVisibleRows = [];

function getUsersApiKey() {
  return generateApiKey();
}


// SUMMARY
function renderUsersSummary(rows, summaryEl) {
  if (!summaryEl) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    summaryEl.innerHTML = '';
    return;
  }

  const totalUsers    = rows.length;
  const activeUsers   = rows.filter((row) => row.status === 'active').length;
  const silverUsers   = rows.filter((row) => row.account_type === 'SILVER').length;
  const goldUsers     = rows.filter((row) => row.account_type === 'GOLD').length;
  const platinumUsers = rows.filter((row) => row.account_type === 'PLATINUM').length;

  summaryEl.innerHTML = `
    <div class="card-grid">
      <div class="card">
        <p class="card-title">Total Users</p>
        <p class="card-value">${totalUsers.toLocaleString()}</p>
      </div>
      <div class="card">
        <p class="card-title">Active Users</p>
        <p class="card-value">${activeUsers.toLocaleString()}</p>
      </div>
      <div class="card">
        <p class="card-title">Silver Accounts</p>
        <p class="card-value">${silverUsers.toLocaleString()}</p>
      </div>
      <div class="card">
        <p class="card-title">Gold Accounts</p>
        <p class="card-value">${goldUsers.toLocaleString()}</p>
      </div>
      <div class="card">
        <p class="card-title">Platinum Accounts</p>
        <p class="card-value">${platinumUsers.toLocaleString()}</p>
      </div>
    </div>
  `;
}

// TABLE WRAPPER
function renderUsersTable(rows) {
  const tableContainer = document.getElementById('users-table-container');

  renderTable(tableContainer, userColumns, rows);
}

function applyUsersVisibleRows(visibleRows) {
  usersVisibleRows = Array.isArray(visibleRows) ? visibleRows : [];

  const summaryEl = document.getElementById('users-summary');

  renderUsersSummary(usersVisibleRows, summaryEl);
  renderUsersTable(usersVisibleRows);
}

function filterUsersRows(rows, term) {
  if (!term) return rows.slice();

  const lowered = term.toLowerCase();

  return rows.filter((row) =>
    userColumns.some((col) => {
      const value = row[col.key];
      return value && String(value).toLowerCase().includes(lowered);
    })
  );
}

// DATA LOADING
async function loadUsersData({ df, dt }) {
  const tableContainer = document.getElementById('users-table-container');
  const tableSearch    = document.getElementById('users-table-search');
  const tableSearchClear = document.getElementById('users-table-search-clear');

  if (tableContainer) {
    tableContainer.innerHTML = '<div class="empty-state">Loading users...</div>';
  }

  try {
    const result = await apiGet(USERS_ENDPOINT, {
      user:   USERS_API_USER,
      apikey: getUsersApiKey(),
      df,
      dt,
    });

    const rows = Array.isArray(result?.data) ? result.data : [];

    if (!rows.length) {
      console.warn(`API call returned 0 users for date range: ${df} to ${dt}.`);
    }

    usersCachedRows = rows;
    if (tableSearch) tableSearch.value = '';
    if (tableSearchClear) tableSearchClear.disabled = true;

    applyUsersVisibleRows(usersCachedRows);
  } catch (err) {
    console.error('Failed to load users', err);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Unable to load users. Please try again later.</div>';
    }
    applyUsersVisibleRows([]);
    return [];
  }
}

function applyUsersTableSearch() {
  const input = document.getElementById('users-table-search');
  const clearBtn = document.getElementById('users-table-search-clear');
  if (!input) return;

  const term = input.value.trim();

  if (clearBtn) {
    clearBtn.disabled = !term;
  }

  const filteredRows = filterUsersRows(usersCachedRows, term);
  applyUsersVisibleRows(filteredRows);
}

// PAGE INIT
function initUsersPage() {
  const fromInput   = document.getElementById('users-from');
  const toInput     = document.getElementById('users-to');
  const filterForm  = document.getElementById('users-filter-form');
  const tableSearch = document.getElementById('users-table-search');
  const tableSearchClear = document.getElementById('users-table-search-clear');
  const exportCsvBtn  = document.getElementById('users-export-csv');
  const exportXlsxBtn = document.getElementById('users-export-xlsx');
  const exportPdfBtn  = document.getElementById('users-export-pdf');

  const { from, to } = getDefaultDateRange();
  if (fromInput && !fromInput.value) fromInput.value = from;
  if (toInput && !toInput.value)     toInput.value   = to;

  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const df = formatDateForApi(fromInput?.value);
      const dt = formatDateForApi(toInput?.value);
      loadUsersData({ df, dt });
    });
  }

  if (!fromInput || !toInput) {
    console.error('Cannot initialize Users page: Missing date inputs.');
    return;
  }

  if (tableSearch) {
    tableSearch.addEventListener('input', applyUsersTableSearch);
  }

  if (tableSearchClear) {
    tableSearchClear.addEventListener('click', (event) => {
      event.preventDefault();
      if (tableSearch) tableSearch.value = '';
      tableSearchClear.disabled = true;
      applyUsersVisibleRows(usersCachedRows);
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      confirmExport('csv', () => {
        exportRowsToCsv(userColumns, usersVisibleRows, 'users.csv');
        showExportSuccess('csv');
      });
    });
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      confirmExport('xlsx', () => {
        exportRowsToXlsx(userColumns, usersVisibleRows, 'users.xlsx');
        showExportSuccess('xlsx');
      });
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      exportTableToPdf(userColumns, usersVisibleRows, 'Users');
    });
  }

  const initialDf      = formatDateForApi(fromInput.value);
  const initialDt      = formatDateForApi(toInput.value);

  loadUsersData({ df: initialDf, dt: initialDt });
}

window.initUsersPage = initUsersPage;
window.loadUsersData = loadUsersData;
