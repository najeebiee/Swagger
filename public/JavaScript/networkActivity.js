// NETWORK ACTIVITY CONFIG
const NETWORK_ACTIVITY_API_USER = 'ggitteam';
const NETWORK_ACTIVITY_ENDPOINT = '/api/networkActivity';
const NETWORK_SYNC_USER_CONCURRENCY = 4;
const NETWORK_SYNC_USERS_START_DF = '20250201';
const NETWORK_SYNC_USER_FETCH_RETRIES = 2;

const networkActivityColumns = [
  { key: 'requestdate', label: 'REQUEST DATE' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'remarks', label: 'REMARKS' }
];

let networkActivityCachedRows = [];
let networkActivityVisibleRows = [];
let networkActivitySyncInProgress = false;

function getNetworkActivityApiKey() {
  return generateApiKey();
}

function getTodayApiDate() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRowsFromApiResult(result) {
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.result)) return result.result;
  if (Array.isArray(result)) return result;
  return [];
}

function getSyncStatusElements() {
  return {
    statusEl: document.getElementById('network-activity-sync-status'),
    progressWrap: document.getElementById('network-activity-sync-progress'),
    progressLabel: document.getElementById('network-activity-sync-progress-label'),
    progressValue: document.getElementById('network-activity-sync-progress-value'),
    progressFill: document.getElementById('network-activity-sync-progress-fill'),
    progressDetail: document.getElementById('network-activity-sync-progress-detail')
  };
}

function showSyncStatus(message, level = 'info') {
  const { statusEl } = getSyncStatusElements();
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.style.display = message ? 'block' : 'none';
  statusEl.classList.remove('warn');
  if (level === 'warn' || level === 'error') {
    statusEl.classList.add('warn');
  }
}

function setSyncProgress({ visible, label, percent, detail }) {
  const { progressWrap, progressLabel, progressValue, progressFill, progressDetail } = getSyncStatusElements();
  if (!progressWrap || !progressLabel || !progressValue || !progressFill || !progressDetail) return;

  if (!visible) {
    progressWrap.classList.add('hidden');
    return;
  }

  progressWrap.classList.remove('hidden');

  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : null;

  progressLabel.textContent = label || 'Sync progress';
  progressValue.textContent = safePercent == null ? '...' : `${safePercent}%`;
  progressFill.style.width = `${safePercent == null ? 0 : safePercent}%`;
  progressDetail.textContent = detail || '';

  const track = progressFill.parentElement;
  if (track) {
    track.setAttribute('aria-valuenow', safePercent == null ? '0' : String(safePercent));
  }
}

function setSyncButtonBusy(isBusy) {
  const syncBtn = document.getElementById('network-activity-sync');
  if (!syncBtn) return;
  syncBtn.disabled = !!isBusy;
  syncBtn.textContent = isBusy ? 'Syncing...' : 'Sync';
}

function inferSourceUsername(row) {
  if (!row || typeof row !== 'object') return '';
  const candidates = [
    row.source_username,
    row.user_name,
    row.username,
    row.buyer_username,
    row.account_username,
    row.member_username,
    row.user,
    row.name
  ];
  const match = candidates.find((value) => value != null && String(value).trim());
  return match ? String(match).trim() : '';
}

function normalizeAmount(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  const cleaned = String(raw).replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}

function fnv1aHash(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `h${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function buildSyncRowHash(normalizedRow) {
  return fnv1aHash(
    stableStringify({
      source_username: normalizedRow.source_username || '',
      requestdate: normalizedRow.requestdate || '',
      amount: normalizedRow.amount,
      remarks: normalizedRow.remarks || ''
    })
  );
}

function normalizeRowsForSync(rows) {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const normalized = {
      source_username: inferSourceUsername(row),
      requestdate: row?.requestdate != null ? String(row.requestdate) : '',
      amount: normalizeAmount(row?.amount),
      remarks: row?.remarks != null ? String(row.remarks) : '',
      raw_row: row && typeof row === 'object' ? row : {}
    };
    normalized.row_hash = buildSyncRowHash(normalized);
    return normalized;
  });
}

function dedupeSyncRows(rows) {
  const seen = new Set();
  const deduped = [];

  rows.forEach((row) => {
    const hash = row?.row_hash || '';
    if (!hash || seen.has(hash)) return;
    seen.add(hash);
    deduped.push(row);
  });

  return deduped;
}

async function fetchAllSourceUsernames({ df, dt } = {}) {
  const result = await apiGet('/api/users', {
    user: NETWORK_ACTIVITY_API_USER,
    apikey: getNetworkActivityApiKey(),
    df,
    dt
  });

  const rows = extractRowsFromApiResult(result);
  const usernames = rows
    .map((row) => row?.user_name || row?.username || row?.user || row?.name)
    .map((value) => (value == null ? '' : String(value).trim()))
    .filter(Boolean);

  return Array.from(new Set(usernames));
}

async function fetchNetworkActivityRowsForUsername(username) {
  if (!username) return [];

  let lastError;
  for (let attempt = 0; attempt <= NETWORK_SYNC_USER_FETCH_RETRIES; attempt += 1) {
    try {
      const result = await apiGet(NETWORK_ACTIVITY_ENDPOINT, {
        user: NETWORK_ACTIVITY_API_USER,
        apikey: getNetworkActivityApiKey(),
        username
      });

      const rows = extractRowsFromApiResult(result);
      return rows.map((row) => ({
        ...(row && typeof row === 'object' ? row : {}),
        source_username: username
      }));
    } catch (error) {
      lastError = error;
      if (attempt < NETWORK_SYNC_USER_FETCH_RETRIES) {
        await delay(200 * (attempt + 1));
      }
    }
  }
  throw lastError || new Error('Failed to fetch network activity for user.');
}

async function fetchNetworkActivityFromAllUsers(usernames, onProgress) {
  const queue = Array.isArray(usernames) ? usernames.slice() : [];
  const totalUsers = queue.length;
  const allRows = [];

  let processedUsers = 0;
  let matchedUsers = 0;
  let totalMatchedRows = 0;

  const worker = async () => {
    while (queue.length) {
      const username = queue.shift();
      if (!username) continue;

      try {
        const rows = await fetchNetworkActivityRowsForUsername(username);
        if (rows.length) {
          matchedUsers += 1;
          totalMatchedRows += rows.length;
          allRows.push(...rows);
        }
      } catch (error) {
        console.warn('Failed network activity fetch for user:', username, error);
      } finally {
        processedUsers += 1;
        if (typeof onProgress === 'function') {
          onProgress({
            processedUsers,
            totalUsers,
            matchedUsers,
            matchedRows: totalMatchedRows
          });
        }
      }
    }
  };

  const workerCount = Math.max(1, Math.min(NETWORK_SYNC_USER_CONCURRENCY, totalUsers || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    rows: allRows,
    processedUsers,
    totalUsers,
    matchedUsers,
    matchedRows: totalMatchedRows
  };
}

// SUMMARY
function renderNetworkActivitySummary(rows, summaryEl) {
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
function renderNetworkActivityTable(rows) {
  const tableContainer = document.getElementById('network-activity-table-container');
  renderTable(tableContainer, networkActivityColumns, rows);
}

function applyNetworkActivityVisibleRows(visibleRows) {
  networkActivityVisibleRows = Array.isArray(visibleRows) ? visibleRows : [];
  const summaryEl = document.getElementById('network-activity-summary');

  renderNetworkActivityTable(networkActivityVisibleRows);
  if (summaryEl) {
    renderNetworkActivitySummary(networkActivityVisibleRows, summaryEl);
  }
}

function filterNetworkActivityRows(rows, term) {
  if (!term) return rows.slice();
  const lowered = term.toLowerCase();

  return rows.filter((row) =>
    networkActivityColumns.some((col) => {
      const value = row[col.key];
      return value && String(value).toLowerCase().includes(lowered);
    })
  );
}

// DATA LOADING
async function loadNetworkActivityData({ username }) {
  const tableContainer = document.getElementById('network-activity-table-container');
  const tableSearchInput = document.getElementById('network-activity-table-search');
  const tableSearchClear = document.getElementById('network-activity-table-search-clear');

  if (tableContainer) {
    tableContainer.innerHTML = '<div class="empty-state">Loading network activity data...</div>';
  }

  try {
    const params = {
      user: NETWORK_ACTIVITY_API_USER,
      apikey: getNetworkActivityApiKey()
    };

    if (username) {
      params.username = username;
    }

    const result = await apiGet(NETWORK_ACTIVITY_ENDPOINT, params);
    const rows = extractRowsFromApiResult(result);

    if (!rows.length) {
      console.warn('No network activity data found for username:', username || '(root)');
    }

    networkActivityCachedRows = rows;
    if (tableSearchInput) tableSearchInput.value = '';
    if (tableSearchClear) tableSearchClear.disabled = true;
    applyNetworkActivityVisibleRows(networkActivityCachedRows);
    return rows;
  } catch (error) {
    console.error('Failed to load network activity data', error);
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="empty-state">Sorry, we could not load the network activity data. Please try again.</div>';
    }
    applyNetworkActivityVisibleRows([]);
    return [];
  }
}

async function createNetworkSyncBatch(supabase, totalRows, totalUsers, sourceScope = 'root') {
  const { data, error } = await supabase
    .from('network_activity_sync_batches')
    .insert({
      source_scope: sourceScope,
      status: 'running',
      total_rows: totalRows,
      total_users: totalUsers,
      inserted_rows: 0
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function updateNetworkSyncBatch(supabase, batchId, payload) {
  const { error } = await supabase
    .from('network_activity_sync_batches')
    .update(payload)
    .eq('id', batchId);

  if (error) throw error;
}

async function insertNetworkSyncRowsInChunks(supabase, batchId, syncRows, onProgress) {
  const chunkSize = 500;
  let insertedRows = 0;
  const coveredUsers = new Set();

  for (let i = 0; i < syncRows.length; i += chunkSize) {
    const chunk = syncRows.slice(i, i + chunkSize).map((row) => ({
      sync_batch_id: batchId,
      source_username: row.source_username || null,
      requestdate: row.requestdate || null,
      amount: row.amount,
      remarks: row.remarks || null,
      row_hash: row.row_hash,
      raw_row: row.raw_row
    }));

    const { error } = await supabase
      .from('network_activity_sync_rows')
      .upsert(chunk, { onConflict: 'sync_batch_id,row_hash', ignoreDuplicates: true });

    if (error) throw error;

    insertedRows += chunk.length;
    chunk.forEach((row) => {
      if (row.source_username) coveredUsers.add(row.source_username);
    });

    if (typeof onProgress === 'function') {
      await onProgress({
        insertedRows,
        coveredUsers: coveredUsers.size
      });
    }
  }

  return {
    insertedRows,
    coveredUsers: coveredUsers.size
  };
}

async function syncNetworkActivityToSupabase() {
  if (networkActivitySyncInProgress) return;
  networkActivitySyncInProgress = true;
  setSyncButtonBusy(true);
  showSyncStatus('Preparing sync...');
  setSyncProgress({
    visible: true,
    label: 'Loading user list...',
    percent: null,
    detail: 'Fetching usernames from source database.'
  });

  let batchId = null;
  try {
    if (typeof window.getSupabase !== 'function') {
      throw new Error('Supabase client is not available.');
    }

    const supabase = window.getSupabase();

    const syncDf = NETWORK_SYNC_USERS_START_DF;
    const syncDt = getTodayApiDate();
    setSyncProgress({
      visible: true,
      label: 'Loading user list...',
      percent: null,
      detail: `Fetching usernames from ${syncDf} to ${syncDt}.`
    });
    const usernames = await fetchAllSourceUsernames({ df: syncDf, dt: syncDt });
    const sourceScope = usernames.length ? 'users_full' : 'users_full_empty';

    const perUserResult = await fetchNetworkActivityFromAllUsers(
      usernames,
      ({ processedUsers, totalUsers, matchedUsers, matchedRows }) => {
        const percent = totalUsers ? (processedUsers / totalUsers) * 100 : 100;
        setSyncProgress({
          visible: true,
          label: 'Fetching activity per user...',
          percent,
          detail: `${processedUsers.toLocaleString()} / ${totalUsers.toLocaleString()} users checked | ${matchedUsers.toLocaleString()} users with activity | ${matchedRows.toLocaleString()} rows found`
        });
      }
    );

    const syncRows = dedupeSyncRows(normalizeRowsForSync(perUserResult.rows));

    const uniqueUsers = new Set(
      syncRows
        .map((row) => row.source_username)
        .filter((value) => value && String(value).trim())
    );

    const totalRows = syncRows.length;
    const totalUsers = uniqueUsers.size;

    setSyncProgress({
      visible: true,
      label: 'Creating sync batch...',
      percent: 0,
      detail: `${totalRows.toLocaleString()} rows ready to store`
    });

    batchId = await createNetworkSyncBatch(supabase, totalRows, totalUsers, sourceScope);

    if (!totalRows) {
      await updateNetworkSyncBatch(supabase, batchId, {
        status: 'completed',
        inserted_rows: 0
      });

      setSyncProgress({
        visible: true,
        label: 'Sync complete',
        percent: 100,
        detail: 'No activity rows found from source.'
      });
      showSyncStatus('Sync completed. No new rows found.', 'warn');
      return;
    }

    const result = await insertNetworkSyncRowsInChunks(
      supabase,
      batchId,
      syncRows,
      async ({ insertedRows, coveredUsers }) => {
        const percent = totalRows ? (insertedRows / totalRows) * 100 : 100;
        setSyncProgress({
          visible: true,
          label: 'Syncing to Supabase...',
          percent,
          detail: `${insertedRows.toLocaleString()} / ${totalRows.toLocaleString()} rows | ${coveredUsers.toLocaleString()} / ${totalUsers.toLocaleString()} users`
        });

        await updateNetworkSyncBatch(supabase, batchId, {
          inserted_rows: insertedRows
        });
      }
    );

    await updateNetworkSyncBatch(supabase, batchId, {
      status: 'completed',
      inserted_rows: result.insertedRows
    });

    setSyncProgress({
      visible: true,
      label: 'Sync complete',
      percent: 100,
      detail: `${result.insertedRows.toLocaleString()} rows stored | ${result.coveredUsers.toLocaleString()} users with activity`
    });
    showSyncStatus('Network activity sync completed successfully.');
  } catch (error) {
    console.error('Network activity sync failed', error);
    if (batchId) {
      try {
        const supabase = window.getSupabase();
        await updateNetworkSyncBatch(supabase, batchId, {
          status: 'failed',
          error_message: String(error?.message || error || 'Unknown sync error').slice(0, 500)
        });
      } catch (updateError) {
        console.error('Failed to mark sync batch as failed', updateError);
      }
    }

    showSyncStatus(
      `Sync failed: ${error?.message || 'Unable to store network activity in Supabase.'}`,
      'error'
    );
    setSyncProgress({
      visible: true,
      label: 'Sync failed',
      percent: null,
      detail: 'Check browser console for details.'
    });
  } finally {
    networkActivitySyncInProgress = false;
    setSyncButtonBusy(false);
  }
}

// PAGE INIT
function initNetworkActivityPage() {
  const usernameInput = document.getElementById('network-activity-username');
  const filterForm = document.getElementById('network-activity-filter-form');
  const tableSearchInput = document.getElementById('network-activity-table-search');
  const tableSearchClear = document.getElementById('network-activity-table-search-clear');
  const exportCsvBtn = document.getElementById('network-activity-export-csv');
  const exportXlsxBtn = document.getElementById('network-activity-export-xlsx');
  const exportPdfBtn = document.getElementById('network-activity-export-pdf');
  const syncBtn = document.getElementById('network-activity-sync');

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      loadNetworkActivityData({ username });
    });
  }

  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', applyNetworkActivityTableSearch);
  }

  if (tableSearchClear) {
    tableSearchClear.addEventListener('click', (event) => {
      event.preventDefault();
      if (tableSearchInput) tableSearchInput.value = '';
      tableSearchClear.disabled = true;
      applyNetworkActivityVisibleRows(networkActivityCachedRows);
    });
  }

  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      syncNetworkActivityToSupabase();
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      confirmExport('csv', () => {
        window.exportRowsToCsv(networkActivityColumns, networkActivityVisibleRows, 'network-activity.csv');
        showExportSuccess('csv');
      });
    });
  }

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      confirmExport('xlsx', () => {
        window.exportRowsToXlsx(networkActivityColumns, networkActivityVisibleRows, 'network-activity.xlsx');
        showExportSuccess('xlsx');
      });
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      window.exportTableToPdf(networkActivityColumns, networkActivityVisibleRows, 'Network Activity');
    });
  }

  showSyncStatus('');
  setSyncProgress({ visible: false });

  // Initial load with NO username; backend uses root hash.
  loadNetworkActivityData({ username: '' });
}

function applyNetworkActivityTableSearch() {
  const input = document.getElementById('network-activity-table-search');
  const clearBtn = document.getElementById('network-activity-table-search-clear');
  const term = input ? input.value.trim() : '';

  if (clearBtn) {
    clearBtn.disabled = !term;
  }

  const filteredRows = filterNetworkActivityRows(networkActivityCachedRows, term);
  applyNetworkActivityVisibleRows(filteredRows);
}

window.loadNetworkActivityData = loadNetworkActivityData;
window.initNetworkActivityPage = initNetworkActivityPage;
