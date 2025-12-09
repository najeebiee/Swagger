// CODES CONFIG
const CODES_API_USER = 'ggitteam';
const CODES_ENDPOINT = '/api/codes';

let codesRowsCache = [];

function getCodesApiKey() {
  return generateApiKey();
}

// SUMMARY
function renderCodesSummary(rows, summaryEl) {
  if (!summaryEl) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    summaryEl.innerHTML = 'No codes data available.';
    return;
  }

  const totalCodes = rows.length;

  summaryEl.innerHTML = `
    <div class="card-grid">
      <div class="card">
        <p class="card-title">Total Codes</p>
        <p class="card-value">${totalCodes.toLocaleString()}</p>
      </div>
    </div>
  `;
}

// TABLE WRAPPER
function renderCodesTable(rows) {
  const tableContainer = document.getElementById('codes-table-container');
  if (!tableContainer) return;

  const columns = [
    { key: 'owner_user_name',    label: 'Owner User Name' },
    { key: 'owner_name',         label: 'Owner Name' },
    { key: 'code_status',        label: 'Code Status' },
    { key: 'sponsor_id',         label: 'Sponsor ID' },
    { key: 'sponsor_login_name', label: 'Sponsor Login Name'},
    { key: 'sponsor_name',       label: 'Sponsor Name'},
    { key: 'used_by_user_name',  label: 'Used By User Name'},
    { key: 'used_by_name',       label: 'Used By Name'},
    { key: 'code_sku',           label: 'Code SKU'},
    { key: 'code_payment',       label: 'Code Payment'},
    { key: 'code',               label: 'Code'},
    { key: 'code_amount',        label: 'Code Amount'},
    { key: 'code_pin',           label: 'Code PIN'},
    { key: 'code_date_created',  label: 'Code Date Created'},
  ];

  renderTable(tableContainer, columns, rows);
}

// DATA LOADING
async function loadCodesData({ df, dt, search }) {
  const summaryEl      = document.getElementById('codes-summary');
  const tableContainer = document.getElementById('codes-table-container');

  if (tableContainer) {
    tableContainer.innerHTML = '<div class="empty-state">Loading codes...</div>';
  }

  try {
    const result = await apiGet(CODES_ENDPOINT, {
      user:   CODES_API_USER,
      apikey: getCodesApiKey(),
      df,
      dt,
    });

    const rows = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    if (!rows.length) {
      console.warn(`API call returned 0 codes for date range: ${df} to ${dt}.`);
    }

    codesRowsCache = rows;
    renderCodesSummary(rows, summaryEl);
    renderCodesTable(rows);
  } catch (err) {
    console.error('Failed to load codes', err);
    if (tableContainer) {
      tableContainer.textContent = 'Unable to load codes. Please try again later.';
    }
    if (summaryEl) {
      summaryEl.innerHTML = '';
    }
    return [];
  }
}

// PAGE INIT
function initCodesPage() {
  const searchInput = document.getElementById('codes-search');
  const fromInput   = document.getElementById('codes-from');
  const toInput     = document.getElementById('codes-to');
  const filterForm  = document.getElementById('codes-filter-form');
  const tableSearchInput = document.getElementById('codes-table-search');

  const { from, to } = getDefaultDateRange();
  if (fromInput && !fromInput.value) fromInput.value = from;
  if (toInput && !toInput.value)     toInput.value   = to;

  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const df = formatDateForApi(fromInput?.value);
      const dt = formatDateForApi(toInput?.value);
      const search = searchInput?.value || '';

      loadCodesData({ df, dt, search });
    });
  }

  if (!fromInput || !toInput) {
    console.error('Date input elements not found in the DOM.');
    return;
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', () => {
      const term = tableSearchInput.value.trim().toLowerCase();

      const rows = !term
        ? codesRowsCache
        : codesRowsCache.filter((row) =>
            [
              'owner_user_name',
              'owner_name',
              'code',
              'code_status',
              'used_by_user_name',
              'sponsor_login_name'
            ].some((key) => String(row[key] ?? '').toLowerCase().includes(term))
          );

      renderCodesTable(rows);
    });
  }

  const initialDf     = formatDateForApi(fromInput.value);
  const initialDt     = formatDateForApi(toInput.value);
  const initialSearch = searchInput?.value || '';

  loadCodesData({ df: initialDf, dt: initialDt, search: initialSearch });
}

window.initCodesPage = initCodesPage;
window.loadCodesData = loadCodesData;
