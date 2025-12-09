// USER UPLINE CONFIG
const SPONSORED_DOWNLINE_API_USER = 'ggitteam';
const SPONSORED_DOWNLINE_ENDPOINT = '/api/sponsoredDownline';

// cache of the "root" upline data loaded on first call
let sponsoredDownlineCache = [];

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

// TABLE WRAPPER (uses shared renderTable from common.js)
function renderSponsoredDownlineTable(rows) {
  const tableContainer = document.getElementById('sponsored-downline-table-container');
  const columns = [
        { key: 'idno',          label: 'ID NO' },
        { key: 'registered',    label: 'REGISTERED' },
        { key: 'user_name',     label: 'USER NAME' },
        { key: 'user',          label: 'USER' },
        { key: 'account_type',  label: 'ACCOUNT TYPE' },
        { key: 'payment',       label: 'PAYMENT' }
    ];

  renderTable(tableContainer, columns, rows);
}

/**
 * Load data:
 * - If reloadFromServer = true → call API (root hash on backend), cache rows
 * - If reloadFromServer = false & username provided → just filter cached rows
 */
async function loadSponsoredDownlineData({ username, reloadFromServer }) {
  const tableContainer = document.getElementById('sponsored-downline-table-container');
  const summaryEl      = document.getElementById('sponsored-downline-summary');

  // 1) Client-side filter mode (no API call)
  if (!reloadFromServer && username && sponsoredDownlineCache.length) {
    const q = username.toLowerCase();

    const filtered = sponsoredDownlineCache.filter(row => {
      const uname = (row.user_name || '').toLowerCase();
      const user  = (row.user || '').toLowerCase();
      return uname.includes(q) || user.includes(q);
    });

    renderSponsoredDownlineSummary(filtered, summaryEl);
    renderSponsoredDownlineTable(filtered);
    return filtered;
  }

  // 2) Server mode: load full tree (root hash handled by backend)
  if (tableContainer) {
    tableContainer.innerHTML =
      '<div class="empty-state">Loading user upline data...</div>';
  }

  try {
    const result = await apiGet(USER_UPLINE_ENDPOINT, {
      user:   USER_UPLINE_API_USER,
      apikey: getSponsoredDownlineApiKey()
      // NOTE: no username here → backend uses ROOT_UPLINE_HASH
    });

    const rows = Array.isArray(result?.data) ? result.data : [];

    sponsoredDownlineCache = rows; // cache the full list

    renderSponsoredDownlineSummary(rows, summaryEl);
    renderSponsoredDownlineTable(rows);
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
function initSponsoredDownlinePage() {
  const usernameInput = document.getElementById('sponsored-downline-username');
  const filterForm    = document.getElementById('sponsored-downline-filter-form');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';

      if (!username) {
        // empty → reset to full list from server
        loadSponsoredDownlineData({ username: '', reloadFromServer: true });
      } else {
        // filter in cache
        console.log('Filtering sponsored downline for username:', username);
        loadSponsoredDownlineData({ username, reloadFromServer: false });
      }
    });
  }

  // Initial load: full tree (no username)
  loadSponsoredDownlineData({ username: '', reloadFromServer: true });
}

window.loadSponsoredDownlineData = loadSponsoredDownlineData;
window.initSponsoredDownlinePage = initSponsoredDownlinePage;

// TABLE WRAPPER (uses shared renderTable from common.js)
/* function renderSponsoredDownlineTable(rows) {
  const tableContainer = document.getElementById('sponsored-downline-container');
    const columns = [
        { key: 'idno',          label: 'ID NO' },
        { key: 'registered',    label: 'REGISTERED' },
        { key: 'user_name',     label: 'USER NAME' },
        { key: 'user',          label: 'USER' },
        { key: 'account_type',  label: 'ACCOUNT TYPE' },
        { key: 'payment',       label: 'PAYMENT' }
    ];

    renderTable(tableContainer, columns, rows);
}
*/
