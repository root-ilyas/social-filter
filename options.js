// SOCIAL FILTER - Options/Dashboard Script
// Created by Muhammad Ilyas

let allEntries = [];
let filteredEntries = [];
let selectedIds = new Set();
let currentSort = { field: 'timestamp', ascending: false };

const platformColors = {
  'Instagram': 'instagram',
  'TikTok': 'tiktok',
  'Snapchat': 'snapchat',
  'Facebook': 'facebook',
  'X (Twitter)': 'twitter',
  'YouTube': 'youtube',
  'Reddit': 'reddit',
  'LinkedIn': 'linkedin'
};

const platformList = [
  { key: 'instagram', name: 'Instagram', icon: '📷' },
  { key: 'tiktok', name: 'TikTok', icon: '🎵' },
  { key: 'snapchat', name: 'Snapchat', icon: '👻' },
  { key: 'facebook', name: 'Facebook', icon: '👤' },
  { key: 'twitter', name: 'X (Twitter)', icon: '🐦' },
  { key: 'youtube', name: 'YouTube', icon: '📺' },
  { key: 'reddit', name: 'Reddit', icon: '🤖' },
  { key: 'linkedin', name: 'LinkedIn', icon: '💼' }
];

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  renderPlatformToggles();
});

async function loadData() {
  const { config, entries, lastCleanup } = await chrome.storage.local.get(['config', 'entries', 'lastCleanup']);
  
  allEntries = entries || [];
  filteredEntries = [...allEntries];
  
  if (config) {
    document.getElementById('globalToggle').checked = config.enabled ?? true;
    document.getElementById('maxEntries').value = config.maxEntries || 5000;
    document.getElementById('maxDays').value = config.maxDays || 365;
  }

  document.getElementById('storageEntries').textContent = allEntries.length;
  if (lastCleanup) {
    document.getElementById('lastCleanup').textContent = new Date(lastCleanup).toLocaleString();
  }

  updateStats();
  updatePlatformFilter();
  applyFilters();
}

function updateStats() {
  const platforms = new Set(allEntries.map(e => e.platform));
  const users = new Set(allEntries.map(e => `${e.platform}:${e.username}`));
  
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const thisWeek = allEntries.filter(e => new Date(e.timestamp).getTime() > weekAgo).length;

  document.getElementById('statTotal').textContent = allEntries.length;
  document.getElementById('statPlatforms').textContent = platforms.size;
  document.getElementById('statUsers').textContent = users.size;
  document.getElementById('statWeek').textContent = thisWeek;
}

function updatePlatformFilter() {
  const platforms = [...new Set(allEntries.map(e => e.platform))].sort();
  const select = document.getElementById('platformFilter');
  select.innerHTML = '<option value="">All Platforms</option>';
  platforms.forEach(p => {
    select.innerHTML += `<option value="${p}">${p}</option>`;
  });
}

function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const platformFilter = document.getElementById('platformFilter').value;
  const dateFilter = document.getElementById('dateFilter').value;

  filteredEntries = allEntries.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.username.toLowerCase().includes(searchTerm) ||
      entry.platform.toLowerCase().includes(searchTerm) ||
      entry.fullUrl.toLowerCase().includes(searchTerm) ||
      (entry.notes && entry.notes.toLowerCase().includes(searchTerm));

    const matchesPlatform = !platformFilter || entry.platform === platformFilter;

    let matchesDate = true;
    if (dateFilter !== 'all') {
      const entryTime = new Date(entry.timestamp).getTime();
      const now = Date.now();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = entryTime > (now - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          matchesDate = entryTime > (now - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          matchesDate = entryTime > (now - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          matchesDate = entryTime > (now - 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    return matchesSearch && matchesPlatform && matchesDate;
  });

  sortEntries();
  renderTable();
}

function sortEntries() {
  filteredEntries.sort((a, b) => {
    let aVal = a[currentSort.field];
    let bVal = b[currentSort.field];

    if (currentSort.field === 'timestamp') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else {
      aVal = (aVal || '').toString().toLowerCase();
      bVal = (bVal || '').toString().toLowerCase();
    }

    if (aVal < bVal) return currentSort.ascending ? -1 : 1;
    if (aVal > bVal) return currentSort.ascending ? 1 : -1;
    return 0;
  });
}

function renderTable() {
  const tbody = document.getElementById('historyTable');
  
  if (filteredEntries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="no-data">
          No entries match your filters
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredEntries.map(entry => {
    const colorClass = platformColors[entry.platform] || 'facebook';
    const date = new Date(entry.timestamp);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isSelected = selectedIds.has(entry.id);

    return `
      <tr>
        <td>
          <input type="checkbox" class="entry-checkbox" data-id="${entry.id}" ${isSelected ? 'checked' : ''}>
        </td>
        <td>
          <div>${dateStr}</div>
          <div style="color: #666; font-size: 11px;">${timeStr}</div>
        </td>
        <td>
          <span class="platform-badge badge-${colorClass}">${entry.platform}</span>
        </td>
        <td>
          <a href="${entry.fullUrl}" target="_blank" class="username-link">
            @${entry.username}
          </a>
        </td>
        <td>
          <input type="text" class="notes-input" data-id="${entry.id}" value="${entry.notes || ''}" placeholder="Add notes...">
        </td>
        <td style="text-align: center;">
          <button class="delete-btn" data-id="${entry.id}" title="Delete">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.entry-checkbox').forEach(cb => {
    cb.addEventListener('change', handleCheckboxChange);
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });

  document.querySelectorAll('.notes-input').forEach(input => {
    input.addEventListener('blur', handleNotesUpdate);
  });
}

function handleCheckboxChange(e) {
  const id = e.target.dataset.id;
  if (e.target.checked) {
    selectedIds.add(id);
  } else {
    selectedIds.delete(id);
  }
}

async function handleDelete(e) {
  const id = e.target.dataset.id;
  if (confirm('Delete this entry?')) {
    allEntries = allEntries.filter(entry => entry.id !== id);
    await chrome.storage.local.set({ entries: allEntries });
    selectedIds.delete(id);
    await loadData();
  }
}

async function handleNotesUpdate(e) {
  const id = e.target.dataset.id;
  const notes = e.target.value;
  
  const entry = allEntries.find(e => e.id === id);
  if (entry) {
    entry.notes = notes;
    await chrome.storage.local.set({ entries: allEntries });
  }
}

function renderPlatformToggles() {
  chrome.storage.local.get(['config'], ({ config }) => {
    // Default config if not exists
    const platforms = config?.platforms || {
      instagram: true,
      tiktok: true,
      snapchat: true,
      facebook: true,
      twitter: true,
      youtube: true,
      reddit: true,
      linkedin: true
    };
    
    const container = document.getElementById('platformToggles');
    container.innerHTML = platformList.map(p => `
      <div class="toggle-row">
        <div class="toggle-info">
          <span class="platform-icon">${p.icon}</span>
          <span class="platform-name">${p.name}</span>
        </div>
        <label class="toggle">
          <input type="checkbox" class="platform-toggle" data-platform="${p.key}" 
            ${platforms[p.key] !== false ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    `).join('');
  });
}

function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`${tab}Tab`).classList.add('active');
    });
  });

  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('platformFilter').addEventListener('change', applyFilters);
  document.getElementById('dateFilter').addEventListener('change', applyFilters);

  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.ascending = !currentSort.ascending;
      } else {
        currentSort.field = field;
        currentSort.ascending = true;
      }
      applyFilters();
    });
  });

  document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
    if (e.target.checked) {
      filteredEntries.forEach(entry => selectedIds.add(entry.id));
    } else {
      selectedIds.clear();
    }
    renderTable();
  });

  document.getElementById('selectAll').addEventListener('click', () => {
    filteredEntries.forEach(entry => selectedIds.add(entry.id));
    renderTable();
  });

  document.getElementById('deleteSelected').addEventListener('click', async () => {
    if (selectedIds.size === 0) {
      alert('No entries selected');
      return;
    }
    
    if (confirm(`Delete ${selectedIds.size} selected entries?`)) {
      allEntries = allEntries.filter(e => !selectedIds.has(e.id));
      await chrome.storage.local.set({ entries: allEntries });
      selectedIds.clear();
      await loadData();
    }
  });

  document.getElementById('exportJson').addEventListener('click', () => {
    const data = JSON.stringify(filteredEntries, null, 2);
    downloadFile(data, 'social-filter-export.json', 'application/json');
  });

  document.getElementById('exportCsv').addEventListener('click', () => {
    const headers = ['Timestamp', 'Platform', 'Username', 'URL', 'Notes'];
    const rows = filteredEntries.map(e => [
      e.timestamp,
      e.platform,
      e.username,
      e.fullUrl,
      e.notes || ''
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    downloadFile(csv, 'social-filter-export.csv', 'text/csv');
  });

  document.getElementById('saveSettings').addEventListener('click', async () => {
    const config = {
      enabled: document.getElementById('globalToggle').checked,
      maxEntries: parseInt(document.getElementById('maxEntries').value),
      maxDays: parseInt(document.getElementById('maxDays').value),
      platforms: {}
    };

    document.querySelectorAll('.platform-toggle').forEach(toggle => {
      config.platforms[toggle.dataset.platform] = toggle.checked;
    });

    await chrome.storage.local.set({ config });
    
    const btn = document.getElementById('saveSettings');
    const originalText = btn.textContent;
    btn.textContent = '✅ Settings Saved!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });

  document.getElementById('clearAll').addEventListener('click', async () => {
    if (confirm('⚠️ Are you sure? This will permanently delete ALL tracked entries. This cannot be undone!')) {
      if (confirm('Final confirmation: Delete everything?')) {
        await chrome.storage.local.set({ entries: [], lastCleanup: Date.now() });
        selectedIds.clear();
        await loadData();
      }
    }
  });
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
