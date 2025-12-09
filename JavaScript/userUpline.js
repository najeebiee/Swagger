// USER UPLINE CONFIG
const USER_UPLINE_API_USER = 'ggitteam';
const USER_UPLINE_ENDPOINT = '/api/userUpline';

// cache of the last loaded rows
let userUplineRowsCache = [];

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
  const columns = [
    { key: 'lvl',       label: 'LEVEL' },
    { key: 'idno',      label: 'ID NO' },
    { key: 'user_name', label: 'USER NAME' },
    { key: 'user',      label: 'USER' },
    { key: 'placement', label: 'PLACEMENT' }
  ];

  renderTable(tableContainer, columns, rows);
}

/**
 * Load data:
 * - If reloadFromServer = true → call API (root hash on backend), cache rows
 * - If reloadFromServer = false & username provided → just filter cached rows
 */
async function loadUserUplineData({ username }) {
  const tableContainer = document.getElementById('user-upline-table-container');
  const summaryEl      = document.getElementById('user-upline-summary');

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

    userUplineRowsCache = rows;
    renderUserUplineSummary(rows, summaryEl);
    renderUserUplineTable(rows);
    return rows;
  } catch (error) {
    console.error('Failed to load user upline data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the user upline data. Please try again.</div>';
    }
    if (summaryEl) summaryEl.innerHTML = '';
    return [];
  }
}


// PAGE INIT
function initUserUplinePage() {
  const usernameInput = document.getElementById('user-upline-username');
  const filterForm    = document.getElementById('user-upline-filter-form');
  const tableSearchInput = document.getElementById('user-upline-table-search');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadUserUplineData({ username });
    });
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', () => {
      const term = tableSearchInput.value.trim().toLowerCase();

      const rows = !term
        ? userUplineRowsCache
        : userUplineRowsCache.filter((row) =>
            ['lvl', 'user_name', 'user', 'placement'].some((key) =>
              String(row[key] ?? '').toLowerCase().includes(term)
            )
          );

      renderUserUplineTable(rows);
    });
  }

  // Initial load with NO username → backend uses ROOT_UPLINE_HASH
  loadUserUplineData({ username: '' });
}


window.loadUserUplineData = loadUserUplineData;
window.initUserUplinePage = initUserUplinePage;
