// SOCIAL FILTER v2.1 - Popup Script with Dynamic Ads
// Created by Muhammad Ilyas

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

const DEFAULT_CONFIG = {
  enabled: true,
  maxEntries: 5000,
  maxDays: 365,
  platforms: {
    instagram: true,
    tiktok: true,
    snapchat: true,
    facebook: true,
    twitter: true,
    youtube: true,
    reddit: true,
    linkedin: true
  }
};

// ========================================
// DYNAMIC AD LOADING SYSTEM
// ========================================
async function loadAds() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/root-ilyas/social-filter-ads/refs/heads/main/ads.json', {
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error('Failed to load ads');
    }
    
    const adsData = await response.json();
    const ads = adsData.banners || [];
    
    if (ads.length === 0) {
      throw new Error('No ads available');
    }
    
    const randomAd = ads[Math.floor(Math.random() * ads.length)];
    const adContainer = document.getElementById('adContainer');
    
    if (randomAd.type === 'image' || (randomAd.type === 'text' && randomAd.image)) {
      // IMAGE AD WITH TEXT OVERLAY
      adContainer.innerHTML = `
        <div class="ad-label">
          <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          Sponsored - ${randomAd.network || 'Ad'}
        </div>
        <a href="${randomAd.link}" target="_blank" rel="noopener noreferrer" class="ad-content ad-image-overlay">
          <img src="${randomAd.image}" alt="${randomAd.label || 'Advertisement'}" loading="lazy" class="ad-bg-image">
          <div class="ad-overlay-gradient"></div>
          <div class="ad-overlay-text">
            <div class="ad-text">${randomAd.text || randomAd.label || ''}</div>
            ${randomAd.subtitle ? `<div class="ad-subtitle">${randomAd.subtitle}</div>` : ''}
          </div>
        </a>
      `;
    } else if (randomAd.type === 'text') {
      // TEXT ONLY AD
      adContainer.innerHTML = `
        <div class="ad-label">
          <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          Sponsored - ${randomAd.network || 'Ad'}
        </div>
        <a href="${randomAd.link}" target="_blank" rel="noopener noreferrer" class="ad-content">
          <div class="ad-text">${randomAd.text}</div>
          ${randomAd.subtitle ? `<div class="ad-subtitle">${randomAd.subtitle}</div>` : ''}
        </a>
      `;
    }
    
  } catch (error) {
    console.log('Ad loading skipped:', error.message);
    
    const adContainer = document.getElementById('adContainer');
    adContainer.innerHTML = `
      <div class="ad-label">
        <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        Sponsored - Daraz
      </div>
      <a href="https://daraz.pk?utm_source=social-filter&utm_medium=extension" target="_blank" rel="noopener noreferrer" class="ad-content">
        <div class="ad-text">Shop Amazing Deals on Daraz</div>
        <div class="ad-subtitle">Electronics, Fashion, Beauty & More - Free Delivery</div>
      </a>
    `;
  }
}

// ========================================
// DATA LOADING & DISPLAY
// ========================================
async function loadData() {
  try {
    const { config, entries } = await chrome.storage.local.get(['config', 'entries']);
    
    const activeConfig = config || DEFAULT_CONFIG;
    const allEntries = entries || [];
    
    const toggle = document.getElementById('trackingToggle');
    toggle.checked = activeConfig.enabled ?? true;
    updateStatusText(toggle.checked);

    const totalCount = allEntries.length;
    const platforms = new Set(allEntries.map(e => e.platform));
    
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('platformCount').textContent = platforms.size;

    const breakdown = {};
    allEntries.forEach(e => {
      breakdown[e.platform] = (breakdown[e.platform] || 0) + 1;
    });

    const breakdownHtml = Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([platform, count]) => {
        const colorClass = platformColors[platform] || 'facebook';
        return `<span class="platform-badge badge-${colorClass}">${platform}: ${count}</span>`;
      })
      .join('');
    
    document.getElementById('platformBreakdown').innerHTML = breakdownHtml || '<p class="no-data">No data yet</p>';

    const recent = allEntries.slice(0, 5);
    const recentHtml = recent.map(e => {
      const colorClass = platformColors[e.platform] || 'facebook';
      const time = new Date(e.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `
        <div class="recent-item" data-url="${e.fullUrl}">
          <div class="recent-item-left">
            <span class="platform-badge badge-${colorClass}" style="padding: 2px 6px; font-size: 9px;">${e.platform}</span>
            <span class="recent-username">@${e.username}</span>
          </div>
          <span class="recent-time">${time}</span>
        </div>
      `;
    }).join('');

    document.getElementById('recentList').innerHTML = recentHtml || '<p class="no-data">No visits yet</p>';

    document.querySelectorAll('.recent-item').forEach(div => {
      div.addEventListener('click', () => {
        chrome.tabs.create({ url: div.dataset.url });
      });
    });
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function updateStatusText(enabled) {
  const statusText = document.getElementById('statusText');
  if (enabled) {
    statusText.textContent = 'Actively tracking profile visits';
    statusText.className = 'status-text status-active';
  } else {
    statusText.textContent = 'Tracking paused';
    statusText.className = 'status-text status-paused';
  }
}

// ========================================
// EVENT LISTENERS
// ========================================
document.getElementById('trackingToggle').addEventListener('change', async (e) => {
  try {
    const { config } = await chrome.storage.local.get(['config']);
    const updatedConfig = config || DEFAULT_CONFIG;
    updatedConfig.enabled = e.target.checked;
    await chrome.storage.local.set({ config: updatedConfig });
    updateStatusText(e.target.checked);
  } catch (error) {
    console.error('Error toggling tracking:', error);
  }
});

document.getElementById('openDashboard').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('viewPrivacy').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('privacy.html') });
});

// ========================================
// INITIALIZE
// ========================================
loadAds();
loadData();
setInterval(loadData, 2000);

console.log('Social Filter v2.1 Popup loaded with Dynamic Ads');
