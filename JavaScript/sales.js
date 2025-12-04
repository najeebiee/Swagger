const fileInput = document.getElementById('jsonFile');
    const tableContainer = document.getElementById('table-container');
    const errorDiv = document.getElementById('error');

    fileInput.addEventListener('change', handleFile, false);

    function handleFile(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        errorDiv.textContent = '';
        tableContainer.innerHTML = '';

        try {
          const json = JSON.parse(e.target.result);
          const rows = normalizeJsonToRows(json);
          if (!rows.length) {
            errorDiv.textContent = 'No rows found in JSON.';
            return;
          }
          const table = buildTable(rows);
          tableContainer.appendChild(table);
        } catch (err) {
          console.error(err);
          errorDiv.textContent = 'Invalid JSON file.';
        }
      };
      reader.readAsText(file);
    }

    // Turn various JSON shapes into an array of row objects
    function normalizeJsonToRows(json) {
      // If it's already an array, use it
      if (Array.isArray(json)) return json;

      // If it has a "data" array (like your file), use that
      if (json && Array.isArray(json.data)) return json.data;

      // If it's a plain object, treat it as a single row
      if (json && typeof json === 'object') return [json];

      return [];
    }

    function buildTable(rows) {
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');

      // Collect all possible keys (columns)
      const columns = Array.from(
        new Set(
          rows.flatMap(row => Object.keys(row || {}))
        )
      );

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

          // Stringify objects/arrays for display
          if (value && typeof value === 'object') {
            value = JSON.stringify(value);
          }

          td.textContent = value !== undefined ? value : '';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(thead);
      table.appendChild(tbody);
      return table;
    }