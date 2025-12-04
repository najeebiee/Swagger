// --- USERS CONFIG ---
const USERS_API_USER = 'ggitteam';
const USERS_API_KEY  = '0720251205'; // Updated to the key you specified (0720251205)
const USERS_ENDPOINT = '/api/users';

// --- DATE HELPERS (Kept for file self-containment) ---

function getDefaultDateRange() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  return {
    from: formatDateForInput(weekAgo),
    to: formatDateForInput(today)
  };
}

function formatDateForInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateForApi(inputValue) {
  return inputValue ? inputValue.replace(/-/g, '') : '';
}

// --- GENERIC TABLE RENDERING (Adopted from sales.js format) ---

/**
 * Renders a table into the specified container using defined columns and rows.
 * @param {HTMLElement} container - The element to append the table to.
 * @param {Array<Object>} columns - Array of { key: string, label: string }.
 * @param {Array<Object>} rows - Array of data objects.
 */
function renderTable(container, columns, rows) {
  if (!container) return;
  container.innerHTML = '';

  // IMPORTANT: Check if rows is an array and if it has length
  if (!Array.isArray(rows) || !rows.length) {
    container.innerHTML = '<div class="empty-state">No data found for this filter.</div>';
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  columns.forEach((col) => {
    const th = document.createElement('th');
    th.textContent = col.label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    columns.forEach((col) => {
      const td = document.createElement('td');
      // Use the key to access the row data, defaulting to empty string
      td.textContent = row[col.key] ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.appendChild(table);
}


// --- SUMMARY / METRICS (Updated style to match sales.js) ---

function renderUsersSummary(rows, summaryEl) {
  if (!summaryEl) return;

  if (!Array.isArray(rows) || !rows.length) {
    summaryEl.innerHTML = '';
    return;
  }

  const totalUsers = rows.length;
  const activeUsers = rows.filter((row) => row.status === 'active').length;
  const silverUsers = rows.filter((row) => row.account_type === 'SILVER').length;
  const goldUsers   = rows.filter((row) => row.account_type === 'GOLD').length;
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

// --- TABLE RENDERING (Refactored to use generic renderTable) ---

function renderUsersTable(rows) {
  const tableContainer = document.getElementById('users-table-container');

  const columns = [
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

  renderTable(tableContainer, columns, rows);
}


// --- DATA LOADING ---

async function loadUsersData({ df, dt, search }) {
  const summaryEl = document.getElementById('users-summary');
  const tableContainer = document.getElementById('users-table-container');

  if (tableContainer) {
    tableContainer.innerHTML = '<div class="empty-state">Loading users...</div>';
  }

  try {
    const result = await apiGet(USERS_ENDPOINT, {
      user: USERS_API_USER,
      apikey: USERS_API_KEY,
      df,
      dt,
      search
    });

    // Ensure we handle non-array responses gracefully
    const rows = Array.isArray(result?.data) ? result.data : [];

    if (!rows.length) {
        console.warn(`API call returned 0 users for date range: ${df} to ${dt}.`);
    }

    renderUsersSummary(rows, summaryEl);
    renderUsersTable(rows);
  } catch (err) {
    console.error('Failed to load users', err);
    if (tableContainer) {
      tableContainer.innerHTML = '<div class="empty-state">Unable to load users. Please try again later.</div>';
    }
    if (summaryEl) {
      summaryEl.innerHTML = '';
    }
  }
}

// --- PAGE INIT ---

function initUsersPage() {
  // NOTE: 'users-search' is assumed to exist in HTML or will be undefined.
  // We handle the case where it might be null or undefined below.
  const searchInput = document.getElementById('users-search');
  const fromInput   = document.getElementById('users-from');
  const toInput     = document.getElementById('users-to');
  const filterForm  = document.getElementById('users-filter-form');

  // Default dates
  const { from, to } = getDefaultDateRange();
  
  // Set default values if inputs exist and are empty
  if (fromInput && !fromInput.value) fromInput.value = from;
  if (toInput && !toInput.value) toInput.value = to;

  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Use the actual input values when submitting
      const df = formatDateForApi(fromInput?.value);
      const dt = formatDateForApi(toInput?.value);
      // Get value from search input, defaulting to empty string if input is not found
      const search = searchInput?.value || ''; 

      loadUsersData({ df, dt, search });
    });
  }
  
  // Guard clause: Only run initial load if required elements are available
  if (!fromInput || !toInput) {
      console.error('Cannot initialize Users page: Missing date inputs.');
      return;
  }

  // Initial load uses the values set above (which default to a 7-day range)
  const initialDf = formatDateForApi(fromInput.value);
  const initialDt = formatDateForApi(toInput.value);
  const initialSearch = searchInput?.value || '';
  
  loadUsersData({ df: initialDf, dt: initialDt, search: initialSearch });
}
window.initUsersPage = initUsersPage;
window.loadUsersData = loadUsersData;