#!/usr/bin/env node
/**
 * Reads two Chase CSV exports, combines them, and outputs a single HTML file
 * with an interactive table (search, filter, sort, totals).
 */
const fs = require('fs');
const path = require('path');

const csv1Path = path.join(process.env.HOME || '', 'Downloads/Chase0517_Activity20250101_20251231_20260222.CSV');
const csv2Path = path.join(process.env.HOME || '', 'Downloads/Chase5132_Activity20250101_20251231_20260222.CSV');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\n' && !inQuotes)) {
      result.push(current.trim());
      current = '';
      if (c === '\n') break;
    } else {
      current += c;
    }
  }
  if (current.length) result.push(current.trim());
  return result;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCSVLine(lines[0] + '\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i] + '\n');
    if (parts.length >= 6) {
      rows.push({
        transactionDate: parts[0] || '',
        postDate: parts[1] || '',
        description: parts[2] || '',
        category: parts[3] || '',
        type: parts[4] || '',
        amount: parseFloat(parts[5]) || 0,
        memo: parts[6] || '',
      });
    }
  }
  return rows;
}

const csv1 = fs.readFileSync(csv1Path, 'utf8');
const csv2 = fs.readFileSync(csv2Path, 'utf8');

const rows1 = parseCSV(csv1).map((r) => ({ ...r, card: '0517' }));
const rows2 = parseCSV(csv2).map((r) => ({ ...r, card: '5132' }));

const all = [...rows1, ...rows2].sort((a, b) => {
  const dA = new Date(a.transactionDate);
  const dB = new Date(b.transactionDate);
  return dB - dA;
});

const dataJson = JSON.stringify(all);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chase Credit Card Activity 2025</title>
  <style>
    :root {
      --bg: #0f1419;
      --surface: #1a2332;
      --border: #2d3a4d;
      --text: #e7e9ea;
      --muted: #8b98a5;
      --accent: #1d9bf0;
      --green: #00ba7c;
      --red: #f4212e;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 1.5rem;
      min-height: 100vh;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      color: var(--text);
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;
    }
    .controls input, .controls select {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.9rem;
    }
    .controls input::placeholder { color: var(--muted); }
    .controls input[type="search"] { min-width: 200px; }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      color: var(--muted);
    }
    .summary span strong { color: var(--text); }
    .summary .positive { color: var(--green); }
    .summary .negative { color: var(--red); }
    .table-wrap {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    th {
      text-align: left;
      padding: 0.6rem 0.75rem;
      background: var(--bg);
      color: var(--muted);
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
      border-bottom: 1px solid var(--border);
    }
    th:hover { color: var(--accent); }
    th.sorted-asc::after { content: ' ▲'; font-size: 0.7em; color: var(--accent); }
    th.sorted-desc::after { content: ' ▼'; font-size: 0.7em; color: var(--accent); }
    td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    tr:hover td { background: rgba(29, 155, 240, 0.06); }
    td.amount { text-align: right; font-variant-numeric: tabular-nums; }
    td.amount.charge { color: var(--red); }
    td.amount.credit { color: var(--green); }
    td.card { font-weight: 600; color: var(--muted); }
    .no-results { padding: 2rem; text-align: center; color: var(--muted); }
  </style>
</head>
<body>
  <h1>Chase Credit Card Activity 2025</h1>
  <div class="controls">
    <input type="search" id="search" placeholder="Search description, category..." />
    <select id="filterCard">
      <option value="">All cards</option>
      <option value="0517">Card ****0517</option>
      <option value="5132">Card ****5132</option>
    </select>
    <select id="filterCategory">
      <option value="">All categories</option>
    </select>
    <select id="filterType">
      <option value="">All types</option>
    </select>
  </div>
  <div class="summary" id="summary"></div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th data-col="transactionDate">Date</th>
          <th data-col="card">Card</th>
          <th data-col="description">Description</th>
          <th data-col="category">Category</th>
          <th data-col="type">Type</th>
          <th data-col="amount">Amount</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
    <div class="no-results" id="noResults" style="display:none;">No transactions match your filters.</div>
  </div>

  <script>
    const DATA = ${dataJson};

    const searchEl = document.getElementById('search');
    const filterCard = document.getElementById('filterCard');
    const filterCategory = document.getElementById('filterCategory');
    const filterType = document.getElementById('filterType');
    const tbody = document.getElementById('tbody');
    const summaryEl = document.getElementById('summary');
    const noResults = document.getElementById('noResults');

    const categories = [...new Set(DATA.map((r) => r.category))].filter(Boolean).sort();
    const types = [...new Set(DATA.map((r) => r.type))].filter(Boolean).sort();
    categories.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      filterCategory.appendChild(opt);
    });
    types.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      filterType.appendChild(opt);
    });

    let sortCol = 'transactionDate';
    let sortDir = -1;

    function formatAmount(n) {
      const s = n >= 0 ? '+' + n.toFixed(2) : n.toFixed(2);
      return (n >= 0 ? '+' : '') + '$' + Math.abs(n).toFixed(2);
    }

    function filterAndSort() {
      const q = (searchEl.value || '').toLowerCase();
      const card = filterCard.value;
      const cat = filterCategory.value;
      const type = filterType.value;
      let rows = DATA.filter((r) => {
        if (card && r.card !== card) return false;
        if (cat && r.category !== cat) return false;
        if (type && r.type !== type) return false;
        if (q) {
          const text = [r.description, r.category, r.type].join(' ').toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      });
      rows = [...rows].sort((a, b) => {
        let va = a[sortCol];
        let vb = b[sortCol];
        if (sortCol === 'amount') {
          va = Number(va);
          vb = Number(vb);
        } else if (sortCol === 'transactionDate' || sortCol === 'postDate') {
          va = new Date(va).getTime();
          vb = new Date(vb).getTime();
        } else {
          va = String(va);
          vb = String(vb);
        }
        if (va < vb) return -1 * sortDir;
        if (va > vb) return 1 * sortDir;
        return 0;
      });
      return rows;
    }

    function render() {
      const rows = filterAndSort();
      const charges = rows.filter((r) => r.amount < 0);
      const credits = rows.filter((r) => r.amount > 0);
      const sumCharges = charges.reduce((s, r) => s + r.amount, 0);
      const sumCredits = credits.reduce((s, r) => s + r.amount, 0);
      const net = sumCharges + sumCredits;

      summaryEl.innerHTML = [
        '<span>Showing <strong>' + rows.length + '</strong> of ' + DATA.length + ' transactions</span>',
        '<span class="negative">Charges: <strong>$' + Math.abs(sumCharges).toFixed(2) + '</strong></span>',
        '<span class="positive">Credits: <strong>$' + sumCredits.toFixed(2) + '</strong></span>',
        '<span>Net: <strong class="' + (net >= 0 ? 'positive' : 'negative') + '">$' + net.toFixed(2) + '</strong></span>',
      ].join('');

      tbody.innerHTML = '';
      rows.forEach((r) => {
        const tr = document.createElement('tr');
        const amountClass = r.amount >= 0 ? 'credit' : 'charge';
        const amountStr = (r.amount >= 0 ? '+' : '') + '$' + Math.abs(r.amount).toFixed(2);
        tr.innerHTML =
          '<td>' + escapeHtml(r.transactionDate) + '</td>' +
          '<td class="card">****' + escapeHtml(r.card) + '</td>' +
          '<td>' + escapeHtml(r.description) + '</td>' +
          '<td>' + escapeHtml(r.category) + '</td>' +
          '<td>' + escapeHtml(r.type) + '</td>' +
          '<td class="amount ' + amountClass + '">' + amountStr + '</td>';
        tbody.appendChild(tr);
      });

      noResults.style.display = rows.length ? 'none' : 'block';
    }

    function escapeHtml(s) {
      if (s == null) return '';
      const div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }

    document.querySelectorAll('th[data-col]').forEach((th) => {
      th.addEventListener('click', () => {
        if (sortCol === th.dataset.col) sortDir *= -1;
        else { sortCol = th.dataset.col; sortDir = 1; }
        document.querySelectorAll('th').forEach((h) => h.classList.remove('sorted-asc', 'sorted-desc'));
        th.classList.add(sortDir === 1 ? 'sorted-asc' : 'sorted-desc');
        render();
      });
    });

    searchEl.addEventListener('input', render);
    searchEl.addEventListener('change', render);
    filterCard.addEventListener('change', render);
    filterCategory.addEventListener('change', render);
    filterType.addEventListener('change', render);

    document.querySelector('th[data-col="transactionDate"]').classList.add('sorted-desc');
    sortCol = 'transactionDate';
    sortDir = -1;
    render();
  </script>
</body>
</html>
`;

const outPath = path.join(process.env.HOME || '', 'Downloads/chase-credit-card-2025.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Wrote:', outPath);
console.log('Total transactions:', all.length);
console.log('Card 0517:', rows1.length, '| Card 5132:', rows2.length);
