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

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadUserUplineData({ username });
    });
  }

  // Initial load with NO username → backend uses ROOT_UPLINE_HASH
  loadUserUplineData({ username: '' });
}


window.loadUserUplineData = loadUserUplineData;
window.initUserUplinePage = initUserUplinePage;
