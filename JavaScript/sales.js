const SALES_API_USER = 'ggitteam';
const SALES_API_KEY = '2320251204';
const SALES_ENDPOINT = '/api.get.sales.php';

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

function renderSalesSummary(rows, summaryEl) {
  if (!summaryEl) return;

  if (!rows.length) {
    summaryEl.innerHTML = '';
    return;
  }

  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalQty = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const distinctStores = new Set(rows.map((row) => row.store_name)).size;

  summaryEl.innerHTML = `
    <div class="card-grid">
      <div class="card">
        <p class="card-title">Transactions</p>
        <p class="card-value">${rows.length.toLocaleString()}</p>
      </div>
      <div class="card">
        <p class="card-title">Total Amount</p>
        <p class="card-value">$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
      <div class="card">
        <p class="card-title">Total Qty</p>
        <p class="card-value">${totalQty.toLocaleString()}</p>
      </div>
      <div class="card">
        <p class="card-title">Stores</p>
        <p class="card-value">${distinctStores.toLocaleString()}</p>
      </div>
    </div>
  `;
}

function renderTable(container, columns, rows) {
  if (!container) return;
  container.innerHTML = '';

  if (!rows.length) {
    container.innerHTML = '<div class="empty-state">No sales found for this date range.</div>';
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
      td.textContent = row[col.key] ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.appendChild(table);
}

function renderSalesTable(rows) {
  const tableContainer = document.getElementById('sales-table-container');
  const columns = [
    { key: 'store_name', label: 'Store Name' },
    { key: 'store_type', label: 'Store Type' },
    { key: 'user', label: 'User' },
    { key: 'user_name', label: 'User Name' },
    { key: 'code_sku', label: 'Code SKU' },
    { key: 'amount', label: 'Amount' },
    { key: 'qty', label: 'Qty' },
    { key: 'transdate', label: 'Transdate' }
  ];

  renderTable(tableContainer, columns, rows);
}

async function loadSalesData({ df, dt }) {
  const tableContainer = document.getElementById('sales-table-container');
  const summaryEl = document.getElementById('sales-summary');

  if (tableContainer) {
    tableContainer.innerHTML = '<div class="empty-state">Loading sales data...</div>';
  }

  try {
    const response = await apiGet(SALES_ENDPOINT, {
      user: SALES_API_USER,
      apikey: SALES_API_KEY,
      df,
      dt
    });

    const rows = Array.isArray(response?.data) ? response.data : [];
    renderSalesSummary(rows, summaryEl);
    renderSalesTable(rows);
    return rows;
  } catch (error) {
    console.error('Failed to load sales data', error);
    if (tableContainer) {
      tableContainer.innerHTML = '<div class="empty-state">Unable to load sales data. Please try again later.</div>';
    }
    if (summaryEl) {
      summaryEl.innerHTML = '';
    }
    return [];
  }
}

function initSalesPage() {
  const form = document.getElementById('sales-filter-form');
  const fromInput = document.getElementById('sales-from');
  const toInput = document.getElementById('sales-to');

  if (!form || !fromInput || !toInput) return;

  const { from, to } = getDefaultDateRange();
  fromInput.value = from;
  toInput.value = to;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const df = formatDateForApi(fromInput.value);
    const dt = formatDateForApi(toInput.value);
    loadSalesData({ df, dt });
  });

  loadSalesData({ df: formatDateForApi(from), dt: formatDateForApi(to) });
}

window.loadSalesData = loadSalesData;
window.initSalesPage = initSalesPage;
