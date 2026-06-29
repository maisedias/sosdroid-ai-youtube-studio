/**
 * SOSDROID AI YOUTUBE STUDIO - CONFIGURATION MODULE
 * Manages configuration settings, API endpoints, and local Gemini API keys.
 */

// Central Configuration Object
export const CONFIG = {
  // Flag to check if we are in a static preview or standalone environment
  isStandalone: !window.location.hostname.includes("run.app") && !window.location.hostname.includes("aistudio"),
  
  // Base URLs for full-stack API endpoints
  apiEndpoints: {
    generate: "/api/gemini/generate",
    playStore: "/api/play-store/search"
  },

  // Default fallback values
  defaultModel: "gemini-3.5-flash",

  /**
   * Retrieves the Gemini API Key.
   * Prioritizes the user's custom key saved in LocalStorage (for standalone mode).
   * In full-stack mode, if empty, the server's environment key is used.
   */
  getGeminiApiKey() {
    return localStorage.getItem("sosdroid_gemini_key") || "";
  },

  /**
   * Saves a custom Gemini API Key to LocalStorage.
   */
  saveGeminiApiKey(key) {
    if (key) {
      localStorage.setItem("sosdroid_gemini_key", key.trim());
    } else {
      localStorage.removeItem("sosdroid_gemini_key");
    }
  },

  /**
   * Clears the saved Gemini API Key.
   */
  clearGeminiApiKey() {
    localStorage.removeItem("sosdroid_gemini_key");
  }
};
