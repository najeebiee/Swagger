// SALES CONFIG
const SALES_API_USER = 'ggitteam';
const SALES_ENDPOINT = '/api/sales';

const salesColumns = [
  { key: 'store_name', label: 'Store Name' },
  { key: 'store_type', label: 'Store Type' },
  { key: 'user',       label: 'User' },
  { key: 'user_name',  label: 'User Name' },
  { key: 'code_sku',   label: 'Code SKU' },
  { key: 'amount',     label: 'Amount' },
  { key: 'qty',        label: 'Qty' },
  { key: 'transdate',  label: 'Transdate' }
];

let salesAllRows = [];
let salesVisibleRows = [];

function getSalesApiKey() {
  return generateApiKey();
}

// SUMMARY
function renderSalesSummary(rows, summaryEl) {
  if (!summaryEl) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    summaryEl.innerHTML = '';
    return;
  }

  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalQty    = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const distinctStores = new Set(rows.map((row) => row.store_name)).size;

  summaryEl.innerHTML = `
    <div class="card-grid">
      <div class="card">
        <p class="card-title">Transactions</p>
        <p class="card-value">${rows.length.toLocaleString()}</p>
      </div>
      <div class="card">
        <p class="card-title">Total Amount</p>
        <p class="card-value">$${totalAmount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}</p>
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

// TABLE WRAPPER
function renderSalesTable(rows) {
  const tableContainer = document.getElementById('sales-table-container');

  renderTable(tableContainer, salesColumns, rows);
}

// DATA LOADING
async function loadSalesData({ df, dt }) {
  const tableContainer = document.getElementById('sales-table-container');
  const summaryEl      = document.getElementById('sales-summary');

  if (tableContainer) {
    tableContainer.innerHTML = '<div class="empty-state">Loading sales data...</div>';
  }

  try {
    const result = await apiGet(SALES_ENDPOINT, {
      user:   SALES_API_USER,
      apikey: getSalesApiKey(),
      df,
      dt
    });

    const rows = Array.isArray(result?.data) ? result.data : [];

    if (!rows.length) {
      console.warn(`API call returned 0 sales for date range: ${df} to ${dt}.`);
    }

    salesAllRows = rows;
    salesVisibleRows = rows;
    renderSalesSummary(salesVisibleRows, summaryEl);
    renderSalesTable(salesVisibleRows);
    return rows;
  } catch (err) {
    console.error('Failed to load sales data', err);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Unable to load sales data. Please try again later.</div>';
    }
    if (summaryEl) {
      summaryEl.innerHTML = '';
    }
    return [];
  }
}

// PAGE INIT
function initSalesPage() {
  const fromInput = document.getElementById('sales-from');
  const toInput   = document.getElementById('sales-to');
  const filterForm  = document.getElementById('sales-filter-form');
  const tableSearchInput = document.getElementById('sales-table-search');
  const exportCsvBtn = document.getElementById('sales-export-csv');
  const exportXlsxBtn = document.getElementById('sales-export-xlsx');
  const exportPdfBtn = document.getElementById('sales-export-pdf');

  const { from, to } = getDefaultDateRange();
  if (fromInput && !fromInput.value) fromInput.value = from;
  if (toInput && !toInput.value)     toInput.value   = to;

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const df = formatDateForApi(fromInput.value);
      const dt = formatDateForApi(toInput.value);
      loadSalesData({ df, dt });
    });
  }

  if (!fromInput || !toInput) {
    console.error('Sales page is missing date input fields.');
    return;
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', applySalesTableSearch);
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      confirmExport('csv', () => {
        exportRowsToCsv(salesColumns, salesVisibleRows, 'sales.csv');
        showExportSuccess('csv');
      });
    });
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      confirmExport('xlsx', () => {
        exportRowsToXlsx(salesColumns, salesVisibleRows, 'sales.xlsx');
        showExportSuccess('xlsx');
      });
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      exportTableToPdf(salesColumns, salesVisibleRows, 'Sales');
    });
  }

  const initialDf = formatDateForApi(fromInput.value);
  const initialDt = formatDateForApi(toInput.value);

  loadSalesData({ df: initialDf, dt: initialDt });
}

function applySalesTableSearch() {
  const summaryEl = document.getElementById('sales-summary');
  const input = document.getElementById('sales-table-search');
  if (!input) return;

  const term = input.value.trim().toLowerCase();

  if (!term) {
    salesVisibleRows = salesAllRows.slice();
  } else {
    salesVisibleRows = salesAllRows.filter((row) =>
      salesColumns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(term))
    );
  }

  renderSalesSummary(salesVisibleRows, summaryEl);
  renderSalesTable(salesVisibleRows);
}

window.loadSalesData = loadSalesData;
window.initSalesPage = initSalesPage;
