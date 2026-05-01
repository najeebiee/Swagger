const DASHBOARD_SUPPORTED_TYPES = [
  'BPGUARD',
  'SGGUARD',
  'Synbiotic+ MM',
  'Silver',
  'Gold',
  'Platinum'
];

const DASHBOARD_TYPE_CANON_MAP = {
  'bpguard': 'BPGUARD',
  'sgguard': 'SGGUARD',
  'synbiotic+ mm': 'Synbiotic+ MM',
  'silver': 'Silver',
  'gold': 'Gold',
  'platinum': 'Platinum'
};

function normalizeDashboardType(raw) {
  if (!raw) return '';
  return String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseItemsFromRawForDashboard(raw) {
  const items = [];
  const warnings = [];
  if (!raw) return { items, warnings };

  const lines = String(raw)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const match = line.match(/^(.+?)\s*\*\s*(\d+)\s*$/);
    if (!match) {
      warnings.push(`Bad format: ${line}`);
      return;
    }
    const canonical = DASHBOARD_TYPE_CANON_MAP[normalizeDashboardType(match[1])];
    const qty = parseInt(match[2], 10) || 0;
    if (!canonical) {
      warnings.push(`Unknown type: ${match[1]}`);
      return;
    }
    if (qty > 0) {
      items.push({ item_type: canonical, qty });
    }
  });

  return { items, warnings };
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDashboardDateInputs() {
  const startDate = document.getElementById('dashboardStartDate');
  const endDate = document.getElementById('dashboardEndDate');
  return { startDate, endDate };
}

function showDashboardStatus(message, level = 'info') {
  const el = document.getElementById('dashboardStatus');
  if (!el) return;
  el.style.display = 'block';
  el.textContent = message;
  el.classList.remove('warn');
  if (level === 'warn' || level === 'error') el.classList.add('warn');
}

function clearDashboardStatus() {
  const el = document.getElementById('dashboardStatus');
  if (!el) return;
  el.style.display = 'none';
  el.textContent = '';
  el.classList.remove('warn');
}

async function fetchSalesRowsForDashboard(supabase, startIso, endIso) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;
  const hardLimit = 25000;

  while (true) {
    let query = supabase
      .from('sales_rows')
      .select('id, transacted_at, depot, buyer_name, buyer_username, ps_code, account_type, items_raw, amount')
      .order('transacted_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (startIso) query = query.gte('transacted_at', startIso);
    if (endIso) query = query.lte('transacted_at', endIso);

    const { data, error } = await query;
    if (error) throw error;

    const chunk = Array.isArray(data) ? data : [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
    if (from >= hardLimit) break;
  }

  return rows;
}

async function fetchItemsMapForDashboard(supabase, rowIds) {
  const map = new Map();
  if (!rowIds.length) return map;

  const chunkSize = 120;
  for (let i = 0; i < rowIds.length; i += chunkSize) {
    const chunk = rowIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('sales_items')
      .select('row_id, item_type, qty')
      .in('row_id', chunk);

    if (error) {
      console.error('Dashboard items fetch failed:', error);
      continue;
    }

    (data || []).forEach((item) => {
      const key = String(item.row_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        item_type: DASHBOARD_TYPE_CANON_MAP[normalizeDashboardType(item.item_type)] || item.item_type,
        qty: Number(item.qty || 0)
      });
    });
  }

  return map;
}

function getRowItemsForDashboard(row, itemsMap) {
  const key = String(row.id);
  const saved = itemsMap.get(key) || [];
  if (saved.length) return { items: saved, hadWarnings: false };
  const parsed = parseItemsFromRawForDashboard(row.items_raw);
  return { items: parsed.items, hadWarnings: parsed.warnings.length > 0 };
}

function buildDashboardModel(rows, itemsMap, uploads) {
  const totals = {
    amount: 0,
    transactions: rows.length,
    uniqueBuyers: 0,
    warnings: 0,
    avgOrderValue: 0,
    topProductLabel: 'N/A',
    topProductQty: 0
  };

  const buyers = new Set();
  const daily = new Map();
  const productTotals = new Map();
  const depotTotals = new Map();
  const recentRows = rows.slice(0, 10);

  DASHBOARD_SUPPORTED_TYPES.forEach((type) => productTotals.set(type, 0));

  rows.forEach((row) => {
    const amount = Number(row.amount || 0);
    totals.amount += amount;

    const buyerKey = String(row.buyer_name || '').trim().toLowerCase();
    if (buyerKey) buyers.add(buyerKey);

    const dayKey = String(row.transacted_at || '').slice(0, 10);
    if (dayKey) {
      if (!daily.has(dayKey)) daily.set(dayKey, { date: dayKey, amount: 0, transactions: 0 });
      const bucket = daily.get(dayKey);
      bucket.amount += amount;
      bucket.transactions += 1;
    }

    const depotKey = String(row.depot || 'Unknown Depot').trim() || 'Unknown Depot';
    if (!depotTotals.has(depotKey)) {
      depotTotals.set(depotKey, { depot: depotKey, amount: 0, transactions: 0 });
    }
    const depotBucket = depotTotals.get(depotKey);
    depotBucket.amount += amount;
    depotBucket.transactions += 1;

    const rowItems = getRowItemsForDashboard(row, itemsMap);
    if (rowItems.hadWarnings) totals.warnings += 1;

    rowItems.items.forEach((item) => {
      const label = DASHBOARD_TYPE_CANON_MAP[normalizeDashboardType(item.item_type)] || item.item_type;
      const next = Number(productTotals.get(label) || 0) + Number(item.qty || 0);
      productTotals.set(label, next);
    });
  });

  totals.uniqueBuyers = buyers.size;
  totals.avgOrderValue = totals.transactions ? totals.amount / totals.transactions : 0;

  const topProduct = Array.from(productTotals.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topProduct && Number(topProduct[1] || 0) > 0) {
    totals.topProductLabel = topProduct[0];
    totals.topProductQty = topProduct[1];
  }

  const trendRows = Array.from(daily.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const productRows = Array.from(productTotals.entries())
    .map(([product, qty]) => ({ product, qty: Number(qty || 0) }))
    .sort((a, b) => b.qty - a.qty);

  const depotRows = Array.from(depotTotals.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return {
    totals,
    trendRows,
    productRows,
    depotRows,
    uploadRows: uploads || [],
    recentRows
  };
}

function renderDashboardKpis(model) {
  const el = document.getElementById('dashboardKpis');
  if (!el) return;

  const cards = [
    { title: 'Total Sales Amount', value: formatCurrency(model.totals.amount) },
    { title: 'Total Transactions', value: model.totals.transactions.toLocaleString() },
    { title: 'Unique Buyers', value: model.totals.uniqueBuyers.toLocaleString() },
    { title: 'Rows With Item Warnings', value: model.totals.warnings.toLocaleString() },
    { title: 'Avg Order Value', value: formatCurrency(model.totals.avgOrderValue) },
    { title: 'Top Product', value: `${model.totals.topProductLabel} (${model.totals.topProductQty.toLocaleString()})` }
  ];

  el.innerHTML = cards.map((card) => `
    <div class="card">
      <p class="card-title">${card.title}</p>
      <p class="card-value">${card.value}</p>
    </div>
  `).join('');
}

function renderBarList(containerId, rows, valueKey, labelKey, formatter) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = '<div class="empty-state">No data in selected date range.</div>';
    return;
  }
  const max = Math.max(...rows.map((r) => Number(r[valueKey] || 0)), 1);
  container.innerHTML = rows.map((row) => {
    const value = Number(row[valueKey] || 0);
    const pct = Math.max(2, Math.round((value / max) * 100));
    return `
      <div class="dashboard-list-item">
        <div class="dashboard-list-item__meta">
          <span class="dashboard-list-item__label">${row[labelKey]}</span>
          <span class="dashboard-list-item__value">${formatter(value, row)}</span>
        </div>
        <div class="dashboard-bar-track">
          <div class="dashboard-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTrend(rows) {
  const container = document.getElementById('dashboardTrend');
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = '<div class="empty-state">No trend data yet.</div>';
    return;
  }
  const max = Math.max(...rows.map((r) => Number(r.amount || 0)), 1);
  container.innerHTML = rows.map((row) => {
    const pct = Math.max(3, Math.round((Number(row.amount || 0) / max) * 100));
    const dateText = new Date(`${row.date}T00:00:00`).toLocaleDateString();
    return `
      <div class="dashboard-trend-row">
        <span class="dashboard-trend-row__date">${dateText}</span>
        <div class="dashboard-trend-row__bar">
          <div class="dashboard-trend-row__fill" style="width:${pct}%"></div>
        </div>
        <span class="dashboard-trend-row__value">${formatCurrency(row.amount)}</span>
      </div>
    `;
  }).join('');
}

function renderUploads(rows) {
  const container = document.getElementById('dashboardUploads');
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = '<div class="empty-state">No uploads found.</div>';
    return;
  }
  container.innerHTML = rows.map((row) => {
    const createdAt = row.created_at ? new Date(row.created_at).toLocaleString() : '';
    return `
      <div class="dashboard-upload-row">
        <div class="dashboard-upload-row__name">${row.filename || 'Upload'}</div>
        <div class="dashboard-upload-row__meta">${(row.row_count || 0).toLocaleString()} rows • ${createdAt}</div>
      </div>
    `;
  }).join('');
}

function renderRecentTransactions(rows, itemsMap) {
  const container = document.getElementById('dashboardRecentTransactions');
  if (!container) return;

  const data = rows.map((row) => {
    const itemDetails = getRowItemsForDashboard(row, itemsMap);
    const totalQty = itemDetails.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const dt = row.transacted_at ? new Date(row.transacted_at) : null;
    return {
      transacted_at: dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleString() : '',
      buyer_name: row.buyer_name || '',
      depot: row.depot || '',
      amount: formatCurrency(row.amount || 0),
      items: totalQty.toLocaleString()
    };
  });

  renderTable(
    container,
    [
      { key: 'transacted_at', label: 'Transacted At' },
      { key: 'buyer_name', label: 'Buyer' },
      { key: 'depot', label: 'Depot' },
      { key: 'items', label: 'Items Qty' },
      { key: 'amount', label: 'Amount' }
    ],
    data,
    'No recent transactions for this date range.'
  );
}

async function loadDashboard() {
  let supabase;
  try {
    supabase = window.getSupabase();
  } catch (err) {
    showDashboardStatus(err.message || 'Supabase is not configured.', 'error');
    return;
  }

  const { startDate, endDate } = getDashboardDateInputs();
  if (!startDate || !endDate) return;

  const startIso = startDate.value ? new Date(`${startDate.value}T00:00:00`).toISOString() : null;
  const endIso = endDate.value ? new Date(`${endDate.value}T23:59:59`).toISOString() : null;

  showDashboardStatus('Loading dashboard data...');

  try {
    const rows = await fetchSalesRowsForDashboard(supabase, startIso, endIso);
    const itemsMap = await fetchItemsMapForDashboard(supabase, rows.map((row) => row.id));
    const { data: uploadsData, error: uploadsError } = await supabase
      .from('sales_uploads')
      .select('id, filename, row_count, created_at')
      .order('created_at', { ascending: false })
      .limit(8);

    if (uploadsError) throw uploadsError;

    const model = buildDashboardModel(rows, itemsMap, uploadsData || []);

    renderDashboardKpis(model);
    renderTrend(model.trendRows);
    renderBarList('dashboardProducts', model.productRows, 'qty', 'product', (value) => value.toLocaleString());
    renderBarList('dashboardDepots', model.depotRows, 'amount', 'depot', (value, row) =>
      `${formatCurrency(value)} • ${row.transactions} tx`
    );
    renderUploads(model.uploadRows);
    renderRecentTransactions(model.recentRows, itemsMap);

    clearDashboardStatus();
  } catch (err) {
    console.error('Dashboard load failed:', err);
    showDashboardStatus(`Failed to load dashboard: ${err.message || 'Unknown error'}`, 'error');
  }
}

function initHomeDashboard() {
  const { startDate, endDate } = getDashboardDateInputs();
  const filterForm = document.getElementById('dashboard-filter-form');
  const refreshBtn = document.getElementById('dashboardRefreshBtn');

  if (startDate && endDate && typeof getDefaultDateRange === 'function') {
    const { from, to } = getDefaultDateRange(30);
    if (!startDate.value) startDate.value = from;
    if (!endDate.value) endDate.value = to;
  }

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      loadDashboard();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadDashboard();
    });
  }

  loadDashboard();
}

window.initHomeDashboard = initHomeDashboard;
