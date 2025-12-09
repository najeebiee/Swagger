// BINARY DOWNLINE CONFIG
/*const BINARY_DOWNLINE_API_USER = 'ggitteam';
const BINARY_DOWNLINE_ENDPOINT = '/api/binaryDownline';

function getBinaryDownlineApiKey() {
  return generateApiKey(); // same helper as other pages
}

// SUMMARY
function renderBinaryDownlineSummary(rows, summaryEl) {
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
function renderBinaryDownlineTable(rows) {
  const tableContainer = document.getElementById('binary-downline-table-container');
  const columns = [
    { key: 'idno',              label: 'ID NO' },
    { key: 'registered',        label: 'REGISTERED' },
    { key: 'user_name',         label: 'USER NAME' },
    { key: 'user',              label: 'USER' },
    { key: 'placement',         label: 'PLACEMENT' },
    { key: 'placement_group',   label: 'PLACEMENT GROUP' },
    { key: 'account_type',      label: 'ACCOUNT TYPE' },
    { key: 'payment',           label: 'PAYMENT' }
  ];

  renderTable(tableContainer, columns, rows);
}

// DATA LOADING – always call the API (like your "proper" user upline)
async function loadBinaryDownlineData({ username }) {
  const tableContainer = document.getElementById('binary-downline-table-container');
  const summaryEl      = document.getElementById('binary-downline-summary');

  if (tableContainer) {
    tableContainer.innerHTML =
      '<div class="empty-state">Loading binary downline data...</div>';
  }

  try {
    const params = {
      user:   BINARY_DOWNLINE_API_USER,
      apikey: getBinaryDownlineApiKey()
    };

    // Only send username if specified – backend turns it into accounthash
    if (username) {
      params.username = username;
    }

    const result = await apiGet(BINARY_DOWNLINE_ENDPOINT, params);

    // Robust shape handling: { data: [...] } OR plain [...]
    const rows = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    if (!rows.length) {
      console.warn('No binary downline data found for username:', username || '(root)');
    }

    renderBinaryDownlineSummary(rows, summaryEl);
    renderBinaryDownlineTable(rows);
    return rows;
  } catch (error) {
    console.error('Failed to load binary downline data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the binary downline data. Please try again.</div>';
    }
    if (summaryEl) summaryEl.innerHTML = '';
    return [];
  }
}

// PAGE INIT
function initBinaryDownlinePage() {
  const usernameInput = document.getElementById('binary-downline-username');
  const filterForm    = document.getElementById('binary-downline-filter-form');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadBinaryDownlineData({ username });
    });
  }

  // Initial load with NO username → backend uses ROOT_DOWNLINE_HASH
  loadBinaryDownlineData({ username: '' });
}

window.loadBinaryDownlineData = loadBinaryDownlineData;
window.initBinaryDownlinePage = initBinaryDownlinePage;
*/