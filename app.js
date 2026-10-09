const FIELD_ALIASES = {
  sku: [
    'sku',
    'sku item',
    'skuitem',
    'item',
    'item sku',
    'itemsku',
    'stock code',
    'product',
    'product code',
    'productcode',
    'item number',
    'itemnumber',
    'sku_code',
    'sku code',
    'inventory item',
    'itemid',
  ],
  picker: [
    'picker',
    'pickers',
    'assigned picker',
    'user',
    'employee',
    'worker',
    'picked by',
    'pick by',
    'person',
    'operator',
  ],
  location: [
    'location',
    'loc',
    'location id',
    'zone',
    'aisle',
    'bin',
    'bin location',
    'slot',
    'storage location',
    'pick location',
  ],
  status: [
    'status',
    'result',
    'outcome',
    'pick status',
    'short pick status',
    'item status',
  ],
  shortPick: [
    'short pick',
    'shortpick',
    'short_pick',
    'is short pick',
    'short pick flag',
    'shortpickflag',
    'short pick y/n',
  ],
  falseShort: [
    'false short pick',
    'false short',
    'false_short_pick',
    'false shortpick',
    'is false short pick',
    'false short pick flag',
  ],
  notFound: [
    'not found item',
    'not found',
    'not_found_item',
    'notfound',
    'item not found',
    'missing item',
    'is not found',
    'not found flag',
  ],
};

const state = {
  rows: [],
  mapping: {},
  sheetName: '',
};

const elements = {
  fileInput: document.getElementById('fileInput'),
  mappingBox: document.getElementById('mappingBox'),
  mappingFields: document.getElementById('mappingFields'),
  applyMappingBtn: document.getElementById('applyMappingBtn'),
  downloadTemplateBtn: document.getElementById('downloadTemplateBtn'),
  totalPicks: document.getElementById('totalPicks'),
  shortPickCount: document.getElementById('shortPickCount'),
  shortPickPct: document.getElementById('shortPickPct'),
  falseShortCount: document.getElementById('falseShortCount'),
  falseShortPct: document.getElementById('falseShortPct'),
  notFoundCount: document.getElementById('notFoundCount'),
  notFoundPct: document.getElementById('notFoundPct'),
  skuItemCount: document.getElementById('skuItemCount'),
  skuTableBody: document.getElementById('skuTableBody'),
  pickerTableBody: document.getElementById('pickerTableBody'),
  locationTableBody: document.getElementById('locationTableBody'),
};

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findBestColumnHeader(headers, aliases) {
  const exact = new Map();

  headers.forEach((header) => {
    const key = normalizeText(header);
    aliases.forEach((alias) => {
      if (key === normalizeText(alias)) {
        exact.set(alias, header);
      }
    });
  });

  for (const alias of aliases) {
    const target = exact.get(alias);
    if (target) return target;
  }

  for (const header of headers) {
    const key = normalizeText(header);
    for (const alias of aliases) {
      if (key.includes(normalizeText(alias))) return header;
    }
  }

  return '';
}

function autoMapColumns(headers) {
  const mapping = {};

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const column = findBestColumnHeader(headers, aliases);
    if (column) {
      mapping[field] = column;
    }
  }

  if (!mapping.sku) mapping.sku = headers[0] || '';
  if (!mapping.picker) mapping.picker = headers[1] || '';
  if (!mapping.location) mapping.location = headers[2] || '';

  return mapping;
}

function getCell(row, key) {
  if (!key) return '';
  return row[key] ?? row[normalizeText(key)] ?? '';
}

function cleanValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const text = normalizeText(value);
  if (!text) return false;
  if (['1', 'yes', 'y', 'true', 't', 'ok', 'active'].includes(text)) return true;
  if (['0', 'no', 'n', 'false', 'f', 'inactive'].includes(text)) return false;
  if (['short pick', 'shortpick', 'short', 'short-pick'].includes(text)) return true;
  return text.includes('short') || text.includes('not found') || text.includes('false');
}

function isShortPick(row, mapping) {
  if (mapping.shortPick && parseBoolean(getCell(row, mapping.shortPick))) return true;
  if (mapping.status) {
    const status = normalizeText(getCell(row, mapping.status));
    if (status.includes('short pick')) return true;
  }
  return false;
}

function isFalseShortPick(row, mapping) {
  if (mapping.falseShort && parseBoolean(getCell(row, mapping.falseShort))) return true;
  if (mapping.status) {
    const status = normalizeText(getCell(row, mapping.status));
    if (status.includes('false short')) return true;
  }
  return false;
}

function isNotFoundItem(row, mapping) {
  if (mapping.notFound && parseBoolean(getCell(row, mapping.notFound))) return true;
  if (mapping.status) {
    const status = normalizeText(getCell(row, mapping.status));
    if (status.includes('not found')) return true;
  }
  return false;
}

function formatPct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function makeTableRows(data, visibleLimit = 12) {
  return data.slice(0, visibleLimit);
}

function renderSummary(summary) {
  const totalPicks = summary.totalPicks || 0;
  const shortPicks = summary.shortPicks || 0;
  const falseShort = summary.falseShort || 0;
  const notFound = summary.notFound || 0;
  const skuItems = summary.skuItems || 0;

  elements.totalPicks.textContent = totalPicks.toLocaleString();
  elements.shortPickCount.textContent = shortPicks.toLocaleString();
  elements.shortPickPct.textContent = formatPct((totalPicks ? (shortPicks / totalPicks) * 100 : 0));
  elements.falseShortCount.textContent = falseShort.toLocaleString();
  elements.falseShortPct.textContent = formatPct((shortPicks ? (falseShort / shortPicks) * 100 : 0));
  elements.notFoundCount.textContent = notFound.toLocaleString();
  elements.notFoundPct.textContent = formatPct((totalPicks ? (notFound / totalPicks) * 100 : 0));
  elements.skuItemCount.textContent = skuItems.toLocaleString();
}

function renderAggregateTable(bodyNode, rows, type) {
  bodyNode.innerHTML = '';

  if (!rows.length) {
    bodyNode.innerHTML = '<tr><td colspan="4">No data available</td></tr>';
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement('tr');

    if (type === 'sku') {
      row.innerHTML = `
        <td>${item.label}</td>
        <td>${item.total}</td>
        <td>${item.short}</td>
        <td>${formatPct(item.shortPct)}</td>
      `;
    }

    if (type === 'picker') {
      row.innerHTML = `
        <td>${item.label}</td>
        <td>${item.total}</td>
        <td>${item.short}</td>
        <td>${formatPct(item.shortPct)}</td>
      `;
    }

    if (type === 'location') {
      row.innerHTML = `
        <td>${item.label}</td>
        <td>${item.total}</td>
        <td>${item.short}</td>
        <td>${formatPct(item.shortPct)}</td>
        <td>${item.notFound}</td>
        <td>${formatPct(item.notFoundPct)}</td>
      `;
    }

    bodyNode.appendChild(row);
  });
}

function buildSummary(rows) {
  const totalPicks = rows.length;
  const shortPicks = rows.filter((row) => row.isShort).length;
  const falseShort = rows.filter((row) => row.isFalseShort).length;
  const notFound = rows.filter((row) => row.isNotFound).length;
  const skuSet = new Set(rows.filter((row) => row.sku).map((row) => row.sku));

  return {
    totalPicks,
    shortPicks,
    falseShort,
    notFound,
    skuItems: skuSet.size,
  };
}

function buildSkuBreakdown(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const key = row.sku || 'Unknown';
    if (!grouped.has(key)) {
      grouped.set(key, { label: key, total: 0, short: 0 });
    }
    const current = grouped.get(key);
    current.total += 1;
    if (row.isShort) current.short += 1;
  });

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      shortPct: item.total ? (item.short / item.total) * 100 : 0,
    }))
    .sort((a, b) => b.shortPct - a.shortPct || b.total - a.total);
}

function buildPickerBreakdown(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const key = row.picker || 'Unassigned';
    if (!grouped.has(key)) {
      grouped.set(key, { label: key, total: 0, short: 0 });
    }
    const current = grouped.get(key);
    current.total += 1;
    if (row.isShort) current.short += 1;
  });

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      shortPct: item.total ? (item.short / item.total) * 100 : 0,
    }))
    .sort((a, b) => b.shortPct - a.shortPct || b.total - a.total);
}

function buildLocationBreakdown(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const key = row.location || 'Unknown';
    if (!grouped.has(key)) {
      grouped.set(key, { label: key, total: 0, short: 0, notFound: 0 });
    }
    const current = grouped.get(key);
    current.total += 1;
    if (row.isShort) current.short += 1;
    if (row.isNotFound) current.notFound += 1;
  });

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      shortPct: item.total ? (item.short / item.total) * 100 : 0,
      notFoundPct: item.total ? (item.notFound / item.total) * 100 : 0,
    }))
    .sort((a, b) => b.shortPct - a.shortPct || b.total - a.total);
}

function createSampleRows() {
  return [
    {
      picker: 'A. Smith',
      sku: 'SKU-1001',
      location: 'A-01',
      status: 'Short Pick',
      shortpick: 'Yes',
      falseshortpick: 'No',
      notfounditem: 'No',
    },
    {
      picker: 'A. Smith',
      sku: 'SKU-1002',
      location: 'A-02',
      status: 'Picked',
      shortpick: 'No',
      falseshortpick: 'No',
      notfounditem: 'No',
    },
    {
      picker: 'B. Jones',
      sku: 'SKU-1003',
      location: 'B-01',
      status: 'Not Found Item',
      shortpick: 'No',
      falseshortpick: 'No',
      notfounditem: 'Yes',
    },
    {
      picker: 'B. Jones',
      sku: 'SKU-1001',
      location: 'A-01',
      status: 'False Short Pick',
      shortpick: 'Yes',
      falseshortpick: 'Yes',
      notfounditem: 'No',
    },
  ];
}

function buildMappingsFromRows(rows) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const mapping = autoMapColumns(headers);
  state.mapping = mapping;
  renderMappingFields(headers, mapping);
  elements.mappingBox.classList.remove('hidden');
}

function renderMappingFields(headers, mapping) {
  const fieldDefinitions = [
    { key: 'sku', label: 'SKU / Item' },
    { key: 'picker', label: 'Picker' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'shortPick', label: 'Short Pick' },
    { key: 'falseShort', label: 'False Short Pick' },
    { key: 'notFound', label: 'Not Found Item' },
  ];

  elements.mappingFields.innerHTML = fieldDefinitions
    .map(({ key, label }) => {
      const options = headers
        .map(
          (header) =>
            `<option value="${header}" ${mapping[key] === header ? 'selected' : ''}>${header}</option>`
        )
        .join('');

      return `
        <div class="field-select">
          <label for="${key}">${label}</label>
          <select id="${key}" data-field="${key}">
            <option value="">-- Select column --</option>
            ${options}
          </select>
        </div>
      `;
    })
    .join('');
}

function applySelectedMapping() {
  const selects = [...document.querySelectorAll('[data-field]')];
  const mapping = {};

  selects.forEach((select) => {
    const key = select.dataset.field;
    if (select.value) mapping[key] = select.value;
  });

  if (!mapping.sku || !mapping.picker || !mapping.location) {
    alert('Please map at least SKU, Picker, and Location columns before calculating results.');
    return;
  }

  state.mapping = mapping;
  processRows();
}

function processRows() {
  const rows = state.rows.map((row) => {
    const sku = cleanValue(getCell(row, state.mapping.sku) || row.sku || row['SKU'] || row['Item'] || '').toString();
    const picker = cleanValue(getCell(row, state.mapping.picker) || row.picker || row['Picker'] || '').toString();
    const location = cleanValue(getCell(row, state.mapping.location) || row.location || row['Location'] || '').toString();

    const record = {
      sku,
      picker,
      location,
      isShort: isShortPick(row, state.mapping),
      isFalseShort: isFalseShortPick(row, state.mapping),
      isNotFound: isNotFoundItem(row, state.mapping),
    };

    return record;
  });

  const summary = buildSummary(rows);
  const skuBreakdown = buildSkuBreakdown(rows);
  const pickerBreakdown = buildPickerBreakdown(rows);
  const locationBreakdown = buildLocationBreakdown(rows);

  renderSummary(summary);
  renderAggregateTable(elements.skuTableBody, makeTableRows(skuBreakdown), 'sku');
  renderAggregateTable(elements.pickerTableBody, makeTableRows(pickerBreakdown), 'picker');
  renderAggregateTable(elements.locationTableBody, makeTableRows(locationBreakdown), 'location');
}

function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  const isCsv = file.name.endsWith('.csv');

  if (!isExcel && !isCsv) {
    alert('Please upload an Excel (.xlsx/.xls) or CSV file.');
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {
    const data = e.target.result;

    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (!rows.length) {
        alert('The file does not contain any rows to analyze.');
        return;
      }

      state.rows = rows;
      buildMappingsFromRows(rows);
    } catch (error) {
      console.error(error);
      alert('There was a problem reading the file. Please try another Excel or CSV file.');
    }
  };

  reader.readAsArrayBuffer(file);
}

function downloadTemplateFile() {
  const sampleRows = createSampleRows();
  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Short Picks');
  XLSX.writeFile(workbook, 'short-pick-template.xlsx');
}

function initialize() {
  elements.fileInput.addEventListener('change', handleFileUpload);
  elements.applyMappingBtn.addEventListener('click', applySelectedMapping);
  elements.downloadTemplateBtn.addEventListener('click', downloadTemplateFile);

  state.rows = createSampleRows();
  buildMappingsFromRows(state.rows);
  processRows();
}

initialize();














































































