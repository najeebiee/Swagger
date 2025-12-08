// USER UPLINE CONFIG
const USER_UPLINE_API_USER = 'ggitteam';
const USER_UPLINE_ENDPOINT = '/api/userUpline'; // 👈 matches server.js route

function getUserUplineApiKey() {
  return generateApiKey(); // same helper you use for other pages
}

// SUMMARY
function renderUserUplineSummary(rows, summaryEl) {
  if (!summaryEl) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    summaryEl.innerHTML = 'No user upline data available.';
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

// TABLE WRAPPER
function renderUserUplineTable(rows) {
  const tableContainer = document.getElementById('user-upline-table-container');
  const columns = [
    { key: 'lvl',       label: 'Level' },
    { key: 'idno',      label: 'ID No' },
    { key: 'user_name', label: 'User Name' },
    { key: 'user',      label: 'User' },
    { key: 'placement', label: 'Placement' }
  ];

  renderTable(tableContainer, columns, rows);
}

// DATA LOADING
async function loadUserUplineData({ username }) {
  const tableContainer = document.getElementById('user-upline-table-container');
  const summaryEl      = document.getElementById('user-upline-summary');

  if (!username) {
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Enter a username and click Apply to view the upline.</div>';
    }
    if (summaryEl) {
      summaryEl.innerHTML = '';
    }
    return [];
  }

  if (tableContainer) {
    tableContainer.innerHTML =
      '<div class="empty-state">Loading user upline data...</div>';
  }

  try {
    const result = await apiGet(USER_UPLINE_ENDPOINT, {
      user:     USER_UPLINE_API_USER,
      apikey:   getUserUplineApiKey(),
      username: username          // 👈 plain username – proxy hashes to accounthash
    });

    const rows = Array.isArray(result?.data) ? result.data : [];

    if (!rows.length) {
      console.warn('No user upline data found for username:', username);
    }

    renderUserUplineSummary(rows, summaryEl);
    renderUserUplineTable(rows);
    return rows;
  } catch (error) {
    console.error('Failed to load user upline data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the user upline data. Please try again.</div>';
    }
    if (summaryEl) {
      summaryEl.innerHTML = '';
    }
    return [];
  }
}

// PAGE INIT
function initUserUplinePage() {
  const usernameInput = document.getElementById('user-upline-username');
  const filterForm    = document.getElementById('user-upline-filter-form');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadUserUplineData({ username });
    });
  }

  // Initial auto-load for default user
  loadUserUplineData({ username: defaultUsername });
}

window.loadUserUplineData = loadUserUplineData;
window.initUserUplinePage = initUserUplinePage;
