// SOCIAL FILTER v2.0 - Background Service Worker
// Created by Muhammad Ilyas - 100% Privacy Focused

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

const PLATFORM_PATTERNS = {
  instagram: {
    regex: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/([a-zA-Z0-9._]+)\/?(\?.*)?$/,
    exclude: /\/(p\/|reel\/|reels\/|stories\/|explore\/|direct\/|accounts\/|challenge\/|tagged\/)/i,
    usernameIndex: 3,
    name: 'Instagram'
  },
  tiktok: {
    regex: /^https?:\/\/(www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)/,
    exclude: /\/(video\/|music\/|tag\/|trending\/|foryou\/|following\/)/i,
    usernameIndex: 2,
    name: 'TikTok'
  },
  snapchat: {
    regex: /^https?:\/\/(www\.)?snapchat\.com\/(add|u)\/([a-zA-Z0-9._-]+)/,
    exclude: /\/(spotlight\/|discover\/|map\/)/i,
    usernameIndex: 3,
    name: 'Snapchat'
  },
  facebook: {
    regex: /^https?:\/\/(www\.)?(facebook|fb)\.com\/(?:profile\.php\?id=(\d+)|([a-zA-Z0-9.]+))/,
    exclude: /\/(watch\/|groups\/|marketplace\/|events\/|pages\/|photo\.php|photos\/|posts\/|share\/|videos\/)/i,
    usernameIndex: [3, 4],
    name: 'Facebook'
  },
  twitter: {
    regex: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/?(\?.*)?$/,
    exclude: /\/(status\/|search|i\/|hashtag\/|explore\/|home|notifications|messages|compose)/i,
    usernameIndex: 3,
    name: 'X (Twitter)'
  },
  youtube: {
    regex: /^https?:\/\/(www\.)?youtube\.com\/(@[a-zA-Z0-9_-]+|channel\/[a-zA-Z0-9_-]+|user\/[a-zA-Z0-9_-]+)/,
    exclude: /\/(watch|shorts|playlist|results|feed|channel\/[^\/]+\/(videos|shorts|streams|playlists))/i,
    usernameIndex: 1,
    name: 'YouTube'
  },
  reddit: {
    regex: /^https?:\/\/(www\.)?reddit\.com\/(user|u)\/([a-zA-Z0-9_-]+)\/?(\?.*)?$/,
    exclude: /\/(comments\/|r\/|submitted|saved|gilded)/i,
    usernameIndex: 3,
    name: 'Reddit'
  },
  linkedin: {
    regex: /^https?:\/\/(www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]+)/,
    exclude: /\/(feed\/|jobs\/|messaging\/|notifications\/|search\/)/i,
    usernameIndex: 2,
    name: 'LinkedIn'
  }
};

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🚀 Social Filter v2.0 - Installation event:', details.reason);
  
  try {
    const stored = await chrome.storage.local.get(['config', 'entries']);
    
    // Always ensure config exists with proper defaults
    const config = stored.config || DEFAULT_CONFIG;
    const entries = stored.entries || [];
    
    await chrome.storage.local.set({
      config: config,
      entries: entries,
      lastCleanup: Date.now()
    });
    
    console.log('✅ Storage initialized:', { configExists: !!config, entriesCount: entries.length });
  } catch (error) {
    console.error('❌ Error during installation:', error);
  }
});

// Also initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('🔄 Social Filter v2.0 - Browser startup');
  
  try {
    const stored = await chrome.storage.local.get(['config', 'entries']);
    
    if (!stored.config) {
      console.log('⚠️ Config not found on startup, initializing...');
      await chrome.storage.local.set({
        config: DEFAULT_CONFIG,
        entries: stored.entries || [],
        lastCleanup: Date.now()
      });
    }
    
    console.log('✅ Startup check complete');
  } catch (error) {
    console.error('❌ Error during startup:', error);
  }
});

// Main tracking listener
chrome.history.onVisited.addListener(async (historyItem) => {
  try {
    const { config, entries } = await chrome.storage.local.get(['config', 'entries']);
    
    // Safety check
    if (!config || !config.enabled) {
      console.log('⏸️ Tracking disabled or config missing');
      return;
    }

    const url = historyItem.url;
    console.log('🔍 Checking URL:', url);
    
    const detection = detectSocialProfile(url, config.platforms);

    if (detection) {
      console.log('✅ Profile detected:', detection);
      
      const newEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        platform: detection.platform,
        username: detection.username,
        fullUrl: url,
        pageTitle: historyItem.title || '',
        notes: ''
      };

      const currentEntries = entries || [];
      
      // Check for duplicate within last 5 minutes
      const existingIndex = currentEntries.findIndex(e => 
        e.fullUrl === url && 
        (Date.now() - new Date(e.timestamp).getTime()) < 300000
      );

      let updatedEntries;
      if (existingIndex !== -1) {
        console.log('🔄 Updating existing entry timestamp');
        updatedEntries = [...currentEntries];
        updatedEntries[existingIndex].timestamp = newEntry.timestamp;
      } else {
        console.log('➕ Adding new entry');
        updatedEntries = [newEntry, ...currentEntries];
      }

      // Cleanup old entries
      updatedEntries = await cleanupEntries(updatedEntries, config);
      
      await chrome.storage.local.set({ entries: updatedEntries });
      console.log('💾 Saved! Total entries:', updatedEntries.length);
    } else {
      console.log('❌ Not a trackable profile page');
    }
  } catch (error) {
    console.error('❌ Error processing visit:', error);
  }
});

function detectSocialProfile(url, enabledPlatforms) {
  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (!enabledPlatforms[platform]) continue;

    const match = url.match(pattern.regex);
    if (!match) continue;

    if (pattern.exclude && pattern.exclude.test(url)) {
      console.log(`⚠️ ${pattern.name} - Excluded by pattern:`, url);
      continue;
    }

    let username;
    if (Array.isArray(pattern.usernameIndex)) {
      username = match[pattern.usernameIndex[0]] || match[pattern.usernameIndex[1]];
    } else {
      username = match[pattern.usernameIndex];
    }

    if (username) {
      return {
        platform: pattern.name,
        username: username.replace(/^@/, ''),
        platformKey: platform
      };
    }
  }
  return null;
}

async function cleanupEntries(entries, config) {
  let cleaned = [...entries];

  if (config.maxDays) {
    const cutoffDate = Date.now() - (config.maxDays * 24 * 60 * 60 * 1000);
    cleaned = cleaned.filter(e => new Date(e.timestamp).getTime() > cutoffDate);
  }

  if (config.maxEntries && cleaned.length > config.maxEntries) {
    cleaned = cleaned.slice(0, config.maxEntries);
  }

  return cleaned;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Periodic cleanup alarm - only create if alarms API is available
if (chrome.alarms) {
  chrome.alarms.create('cleanup', { periodInMinutes: 60 });
  
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'cleanup') {
      console.log('🧹 Running periodic cleanup...');
      const { config, entries } = await chrome.storage.local.get(['config', 'entries']);
      if (entries && entries.length > 0) {
        const cleaned = await cleanupEntries(entries, config || DEFAULT_CONFIG);
        if (cleaned.length !== entries.length) {
          await chrome.storage.local.set({ entries: cleaned, lastCleanup: Date.now() });
          console.log(`✅ Cleanup complete. Removed ${entries.length - cleaned.length} entries`);
        }
      }
    }
  });
} else {
  console.warn('⚠️ Alarms API not available');
}

console.log('🎯 Social Filter v2.0 Background Service Worker loaded');
