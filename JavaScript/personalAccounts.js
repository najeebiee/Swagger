// PERSONAL ACCOUNTS CONFIG
const PERSONAL_ACCOUNTS_API_USER = 'ggitteam';
const PERSONAL_ACCOUNTS_ENDPOINT = '/api/personalAccounts';

let personalAccountsRowsCache = [];

function getPersonalAccountsApiKey() {
  return generateApiKey(); // same helper as other pages
}

// SUMMARY
function renderPersonalAccountsSummary(rows, summaryEl) {
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
function renderPersonalAccountsTable(rows) {
  const tableContainer = document.getElementById('personal-accounts-table-container');
  const columns = [
    { key: 'idno',         label: 'ID NO' },
    { key: 'registered',   label: 'REGISTERED' },
    { key: 'user_name',    label: 'USER NAME' },
    { key: 'user',         label: 'USER' },
    { key: 'account_type', label: 'ACCOUNT TYPE' },
    { key: 'payment',      label: 'PAYMENT' }
  ];

  renderTable(tableContainer, columns, rows);
}

// DATA LOADING – always call the API (like your "proper" user upline)
async function loadPersonalAccountsData({ username }) {
  const tableContainer = document.getElementById('personal-accounts-table-container');
  const summaryEl      = document.getElementById('personal-accounts-summary');

  if (tableContainer) {
    tableContainer.innerHTML =
      '<div class="empty-state">Loading personal accounts data...</div>';
  }

  try {
    const params = {
      user:   PERSONAL_ACCOUNTS_API_USER,
      apikey: getPersonalAccountsApiKey()
    };

    // Only send username if specified – backend turns it into accounthash
    if (username) {
      params.username = username;
    }

    const result = await apiGet(PERSONAL_ACCOUNTS_ENDPOINT, params);

    // Robust shape handling: { data: [...] } OR plain [...]
    const rows = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    personalAccountsRowsCache = rows;

    if (!rows.length) {
      console.warn('No personal accounts data found for username:', username || '(root)');
    }

    renderPersonalAccountsSummary(rows, summaryEl);
    renderPersonalAccountsTable(rows);
    return rows;
  } catch (error) {
    console.error('Failed to load personal accounts data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the personal accounts data. Please try again.</div>';
    }
    if (summaryEl) summaryEl.innerHTML = '';
    return [];
  }
}

// PAGE INIT
function initPersonalAccountsPage() {
  const usernameInput = document.getElementById('personal-accounts-username');
  const filterForm    = document.getElementById('personal-accounts-filter-form');
  const tableSearchInput = document.getElementById('personal-accounts-table-search');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadPersonalAccountsData({ username });
    });
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', () => {
      const term = tableSearchInput.value.trim().toLowerCase();

      const rows = !term
        ? personalAccountsRowsCache
        : personalAccountsRowsCache.filter((row) =>
            [
              'user_name',
              'user',
              'account_type',
              'payment',
              'registered'
            ].some((key) => String(row[key] ?? '').toLowerCase().includes(term))
          );

      renderPersonalAccountsTable(rows);
    });
  }

  // Initial load with NO username → backend uses ROOT_DOWNLINE_HASH
  loadPersonalAccountsData({ username: '' });
}

window.loadPersonalAccountsData = loadPersonalAccountsData;
window.initPersonalAccountsPage = initPersonalAccountsPage;
