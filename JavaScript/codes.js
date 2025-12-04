// --- CODES CONFIG ---
const CODES_API_USER = 'ggitteam';
const CODES_API_KEY  = '0620251205';
const CODES_ENDPOINT = '/api/codes';

function getCodesDefaultDateRange() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  return {
    from: formatDateForInput(weekAgo),
    to: formatDateForInput(today)
  };
}

// --- TABLE RENDERING (generic) ---

function renderCodesTable(rows) {
  const container = document.getElementById('codes-table-container');
  if (!container) return;

  container.innerHTML = '';

  if (!rows.length) {
    container.textContent = 'No codes data available for this filter.';
    return;
  }

  // Generic dynamic table (similar to JSON→table helper)
  const columns = Array.from(
    new Set(
      rows.flatMap(row => Object.keys(row || {}))
    )
  );

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // Header
  const headerRow = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // Body
  rows.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const td = document.createElement('td');
      let value = row ? row[col] : '';
      if (value && typeof value === 'object') {
        value = JSON.stringify(value);
      }
      td.textContent = value ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
}

// --- DATA LOADING ---

async function loadCodesData({ df, dt, search }) {
  const tableContainer = document.getElementById('codes-table-container');
  if (tableContainer) {
    tableContainer.textContent = 'Loading codes...';
  }

  try {
    const result = await apiGet(CODES_ENDPOINT, {
      user: CODES_API_USER,
      apikey: CODES_API_KEY,
      df,
      dt,
      search
    });

    // If API returns { data: [...] }, adapt here
    const rows = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    renderCodesTable(rows);
  } catch (err) {
    console.error('Failed to load codes', err);
    if (tableContainer) {
      tableContainer.textContent = 'Unable to load codes. Please try again later.';
    }
  }
}

// --- PAGE INIT ---

function initCodesPage() {
  const searchInput = document.getElementById('codes-search');
  const fromInput   = document.getElementById('codes-from');
  const toInput     = document.getElementById('codes-to');
  const filterForm  = document.getElementById('codes-filter-form');

  const { from, to } = getCodesDefaultDateRange();
  if (fromInput && !fromInput.value) fromInput.value = from;
  if (toInput && !toInput.value) toInput.value = to;

  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const df = formatDateForApi(fromInput?.value);
      const dt = formatDateForApi(toInput?.value);
      const search = searchInput?.value || '';

      loadCodesData({ df, dt, search });
    });
  }

  const df = formatDateForApi(fromInput?.value);
  const dt = formatDateForApi(toInput?.value);
  const search = searchInput?.value || '';
  loadCodesData({ df, dt, search });
}
window.initCodesPage = initCodesPage;
window.loadCodesData = loadCodesData;