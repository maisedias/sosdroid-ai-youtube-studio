/**
 * SOSDROID AI YOUTUBE STUDIO - PERSISTENCE MODULE (LOCAL STORAGE)
 * Implements full database operations for the video optimization records (up to 500 items).
 * Includes statistics computation, searching, importing/exporting, and backup.
 */

const STORAGE_KEY = "sosdroid_video_history";

/**
 * Retrieves the complete array of video records, sorted newest first.
 * @returns {Array<object>}
 */
export function getHistory() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const list = JSON.parse(data);
    if (!Array.isArray(list)) return [];
    // Sort descending by date (newest first)
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error("Error parsing video history:", e);
    return [];
  }
}

/**
 * Saves a generated video record. Truncates history automatically to 500 records max.
 * @param {object} item - Video optimization record.
 * @returns {Array<object>} Updated list.
 */
export function saveVideoRecord(item) {
  const history = getHistory();
  
  // Set ID and timestamps
  const record = {
    id: item.id || "vid_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    appName: item.appName || "Aplicativo Android",
    category: item.category || "Ferramentas",
    developer: item.developer || "Desenvolvedor",
    icon: item.icon || "https://play-lh.googleusercontent.com/c28668Y4uEPf1Xl8ALe6v3I0_b_E52N_yUuX-362yv78v94J3P3-F=w240-h240",
    descriptionOfficial: item.descriptionOfficial || "",
    userInstructions: item.userInstructions || "",
    
    // AI Results
    titles: item.titles || [],
    descriptionGenerated: item.descriptionGenerated || "",
    tags: item.tags || [],
    hashtags: item.hashtags || [],
    pinnedComment: item.pinnedComment || "",
    thumbnailTexts: item.thumbnailTexts || [],
    
    // SEO & Safe metrics
    seoScore: Number(item.seoScore) || 90,
    seoAnalysis: item.seoAnalysis || {},
    safeReport: item.safeReport || [],
    
    createdAt: item.createdAt || new Date().toISOString()
  };

  // If editing an existing item, replace it
  const index = history.findIndex(v => v.id === record.id);
  if (index !== -1) {
    history[index] = record;
  } else {
    history.unshift(record); // Add to the beginning
  }

  // Truncate to maximum of 500 records
  if (history.length > 500) {
    history.splice(500);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

/**
 * Deletes a video record by ID.
 * @param {string} id - Record ID.
 * @returns {Array<object>} Updated list.
 */
export function deleteVideoRecord(id) {
  const history = getHistory();
  const filtered = history.filter(v => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

/**
 * Clones a record, updates its creation timestamp, and appends it to the database.
 * @param {string} id - Source record ID.
 * @returns {object | null} The duplicated record.
 */
export function duplicateVideoRecord(id) {
  const history = getHistory();
  const original = history.find(v => v.id === id);
  if (!original) return null;

  const copy = {
    ...original,
    id: "vid_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    appName: original.appName + " (Cópia)",
    createdAt: new Date().toISOString()
  };

  saveVideoRecord(copy);
  return copy;
}

/**
 * Filters the history array matching a search query.
 * @param {string} query - Query.
 * @returns {Array<object>}
 */
export function searchHistory(query) {
  const history = getHistory();
  if (!query) return history;
  
  const q = query.toLowerCase().trim();
  return history.filter(v => {
    return (
      v.appName.toLowerCase().includes(q) ||
      (v.category && v.category.toLowerCase().includes(q)) ||
      (v.developer && v.developer.toLowerCase().includes(q)) ||
      v.titles.some(t => t.toLowerCase().includes(q)) ||
      v.tags.some(tag => tag.toLowerCase().includes(q))
    );
  });
}

/**
 * Computes dashboard stats.
 * @returns {object} Stat values.
 */
export function getDashboardStats() {
  const history = getHistory();
  
  const totalVideos = history.length;
  
  let avgSeo = 0;
  let totalTitles = 0;
  let totalWordsBlocked = 0;
  let lastVideoDate = null;

  if (totalVideos > 0) {
    const sumSeo = history.reduce((sum, v) => sum + (v.seoScore || 0), 0);
    avgSeo = Math.round(sumSeo / totalVideos);
    
    totalTitles = history.reduce((sum, v) => sum + (v.titles?.length || 0), 0);
    
    totalWordsBlocked = history.reduce((sum, v) => {
      const blockedCount = v.safeReport?.reduce((acc, r) => acc + (r.count || 1), 0) || 0;
      return sum + blockedCount;
    }, 0);
    
    // The history is already sorted newest first, so index 0 is the last run
    lastVideoDate = history[0].createdAt;
  }

  return {
    totalVideos,
    avgSeo,
    totalTitles,
    totalWordsBlocked,
    lastVideoDate
  };
}

/**
 * Restores/overwrites history from a raw JSON array.
 * @param {Array<object>} list - Imported list.
 * @returns {boolean} True if successfully validated and saved.
 */
export function importHistoryData(list) {
  if (!Array.isArray(list)) return false;
  
  // Basic validation
  const validatedList = list.filter(item => {
    return item && typeof item === 'object' && item.appName && Array.isArray(item.titles);
  });

  if (validatedList.length === 0 && list.length > 0) return false;

  // Merge or overwrite (overwriting is cleaner for restore backup, but let's do a merge to prevent loss)
  const current = getHistory();
  const merged = [...validatedList];
  
  // Avoid duplicates based on ID
  current.forEach(curItem => {
    if (!merged.some(m => m.id === curItem.id)) {
      merged.push(curItem);
    }
  });

  // Limit to 500
  if (merged.length > 500) {
    merged.splice(500);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return true;
}
