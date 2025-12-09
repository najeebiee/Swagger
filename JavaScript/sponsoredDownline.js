// SPONSORED DOWNLINE CONFIG
const SPONSORED_DOWNLINE_API_USER = 'ggitteam';
const SPONSORED_DOWNLINE_ENDPOINT = '/api/sponsoredDownline';

// cache of the "root" downline data loaded on first call
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
        { key: 'idno',       label: 'ID NO' },
        { key: 'registered',       label: 'REGISTERED' },
        { key: 'user_name',       label: 'USER NAME' },
        { key: 'user',       label: 'USER' },
        { key: 'account_type',       label: 'ACCOUNT TYPE' },
        { key: 'payment',       label: 'PAYMENT' }
    ];

    renderTable(tableContainer, columns, rows);
}

async function loadSponsoredDownlineData({ username, reloadFromServer }) {
    const tableContainer = document.getElementById('sponsored-downline-table-container');
    const summaryEl      = document.getElementById('sponsored-downline-summary');

    // 1) Client-side filter mode (no API call)
    if (!reloadFromServer && username && sponsoredDownlineCache.length) {
        const q = username.toLowerCase();

        const filtered = sponsoredDownlineCache.filter(row => {
            const uname = (row.user_name || '').toLowerCase();
            const user = (row.user || '').toLowerCase();
            return uname.includes(q) || user.includes(q);
        });

        renderSponsoredDownlineTable(filtered);
        renderSponsoredDownlineSummary(filtered, summaryEl);
        return filtered;
    }

    if (tableContainer)
        tableContainer.innerHTML = '<p>Loading data from server...</p>';

    try {
        const result = await apiGet(SPONSORED_DOWNLINE_ENDPOINT, {
            user: SPONSORED_DOWNLINE_API_USER,
            api_key: getSponsoredDownlineApiKey()
        });

        const rows = Array.isArray(result.data) ? result.data : [];
        sponsoredDownlineCache = rows; // cache for future filtering

        renderSponsoredDownlineTable(rows);
        renderSponsoredDownlineSummary(rows, summaryEl);
        return rows;
    } catch (error) {
        console.error('Error loading sponsored downline data:', error);
        if (tableContainer) {
            tableContainer.innerHTML = '<p class="error">Error loading data from server.</p>';
        }
        if (summaryEl) {
            summaryEl.innerHTML = '';
        }
        return [];
    }
}
function initSponsoredDownlinePage() {
    const usernameInput = document.getElementById('sponsored-downline-username');
    const filterForm = document.getElementById('sponsored-downline-filter-form');

    if (filterForm) {
        filterForm.addEventListener('submit', event => {
            event.preventDefault();
            const username = usernameInput ? usernameInput.value.trim() : '';
            
            if (!username) {
                loadSponsoredDownline({ username: '', reloadFromServer: true });
            }else {
                loadSponsoredDownline({ username, reloadFromServer: false });
            }
        });
    }

    // Initial load
    loadSponsoredDownline({ username: '', reloadFromServer: true });
}

window.loadSponsoredDownlineData = loadSponsoredDownlineData;
window.initSponsoredDownlinePage = initSponsoredDownlinePage;