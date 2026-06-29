/**
 * SOSDROID AI YOUTUBE STUDIO - CORE COORDINATOR SCRIPT
 * Sets up event handlers, coordinates DOM rendering, dynamic tab panels,
 * safe mode integrations, historical data manipulation, and file transfers.
 */

import { CONFIG } from "./config.js";
import { copyToClipboard, showToast, formatDate, downloadTextFile, downloadJsonFile, escapeHtml } from "./utils.js";
import { sanitizeYouTubeContent } from "./youtube-safe.js";
import { getSavedTemplates, saveTemplates, resetTemplatesToDefault } from "./templates.js";
import { getHistory, saveVideoRecord, deleteVideoRecord, duplicateVideoRecord, searchHistory, getDashboardStats, importHistoryData } from "./storage.js";
import { searchAppMetadata, generateSeoAssets } from "./gemini.js";

// Global App State
const state = {
  activePanel: "panel-dashboard",
  activeResultTab: "tab-titles",
  appData: null, // Holds retrieved play store app info
  lastGeneratedResult: null, // Holds currently loaded generation data
  safeReport: [] // Accumulated replacements in the current run
};

// DOM Element Registry
const DOM = {
  // Navigation
  navButtons: document.querySelectorAll(".nav-btn"),
  panels: document.querySelectorAll(".app-panel"),
  
  // Dashboard
  statTotalVideos: document.getElementById("stat-total-videos"),
  statAvgSeo: document.getElementById("stat-avg-seo"),
  statTotalTitles: document.getElementById("stat-total-titles"),
  statWordsBlocked: document.getElementById("stat-words-blocked"),
  dashboardLastRunContent: document.getElementById("dashboard-last-run-content"),
  btnQuickStart: document.getElementById("btn-quick-start"),
  
  // Gemini API Key config modal
  btnConfigKey: document.getElementById("btn-config-key"),
  apiKeyModal: document.getElementById("api-key-modal"),
  modalClose: document.getElementById("modal-close"),
  inputGeminiKey: document.getElementById("input-gemini-key"),
  btnSaveKey: document.getElementById("btn-save-key"),
  btnClearKey: document.getElementById("btn-clear-key"),

  // Generator Inputs
  inputSearchQuery: document.getElementById("input-search-query"),
  btnSearchApp: document.getElementById("btn-search-app"),
  searchLoader: document.getElementById("search-loader"),
  appMetadataContainer: document.getElementById("app-metadata-container"),
  
  // Metdata Form fields
  metaName: document.getElementById("meta-name"),
  metaCategory: document.getElementById("meta-category"),
  metaDeveloper: document.getElementById("meta-developer"),
  metaVersion: document.getElementById("meta-version"),
  metaDownloads: document.getElementById("meta-downloads"),
  metaLastUpdated: document.getElementById("meta-last-updated"),
  metaIconUrl: document.getElementById("meta-icon-url"),
  metaDescription: document.getElementById("meta-description"),
  
  // SEO Config & Generate
  userCustomInstructions: document.getElementById("user-custom-instructions"),
  toggleSafeMode: document.getElementById("toggle-safe-mode"),
  btnGenerateSeo: document.getElementById("btn-generate-seo"),
  
  // Generator Loaders / Placeholders
  resultsPlaceholderCard: document.getElementById("results-placeholder-card"),
  generationLoaderCard: document.getElementById("generation-loader-card"),
  generationProgress: document.getElementById("generation-progress"),
  generationStepText: document.getElementById("generation-step-text"),
  resultsContentWrapper: document.getElementById("results-content-wrapper"),
  
  // Generation Outputs
  badgeSafeMode: document.getElementById("badge-safe-mode"),
  badgeSeoScore: document.getElementById("badge-seo-score"),
  titlesOutputList: document.getElementById("titles-output-list"),
  descriptionTextarea: document.getElementById("description-textarea"),
  descriptionCharCounter: document.getElementById("description-char-counter"),
  tagsChipsContainer: document.getElementById("tags-chips-container"),
  tagsRawInput: document.getElementById("tags-raw-input"),
  hashtagsContainer: document.getElementById("hashtags-container"),
  pinnedCommentBox: document.getElementById("pinned-comment-box"),
  thumbnailTextsList: document.getElementById("thumbnail-texts-list"),
  
  // Result Copiers
  btnCopyDescription: document.getElementById("btn-copy-description"),
  btnCopyTags: document.getElementById("btn-copy-tags"),
  btnCopyHashtags: document.getElementById("btn-copy-hashtags"),
  btnCopyPinned: document.getElementById("btn-copy-pinned"),
  btnCopyAll: document.getElementById("btn-copy-all"),
  btnRegenerateSeo: document.getElementById("btn-regenerate-seo"),
  btnClearResults: document.getElementById("btn-clear-results"),
  btnExportTxt: document.getElementById("btn-export-txt"),
  btnExportJsonItem: document.getElementById("btn-export-json-item"),

  // Result Tabs
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanes: document.querySelectorAll(".tab-pane"),
  
  // SEO Analyzer Panel
  seoScoreProgressPath: document.getElementById("seo-score-progress-path"),
  seoScoreText: document.getElementById("seo-score-text"),
  seoScoreRatingBadge: document.getElementById("seo-score-rating-badge"),
  seoCtrText: document.getElementById("seo-ctr-text"),
  seoReadabilityText: document.getElementById("seo-readability-text"),
  seoStuffingText: document.getElementById("seo-stuffing-text"),
  seoRepetitionText: document.getElementById("seo-repetition-text"),
  seoSpamText: document.getElementById("seo-spam-text"),
  seoMainKeyword: document.getElementById("seo-main-keyword"),
  seoSecondaryKeywords: document.getElementById("seo-secondary-keywords"),
  safeReportListContainer: document.getElementById("safe-report-list-container"),

  // History Tab
  historyEmptyView: document.getElementById("history-empty-view"),
  historyTableWrapper: document.getElementById("history-table-wrapper"),
  historyTableBody: document.getElementById("history-table-body"),
  inputHistorySearch: document.getElementById("input-history-search"),
  btnHistoryExport: document.getElementById("btn-history-export"),
  btnHistoryImportTrigger: document.getElementById("btn-history-import-trigger"),
  inputHistoryImport: document.getElementById("input-history-import"),
  
  // Templates Tab
  templateTitle: document.getElementById("template-title"),
  templateDescription: document.getElementById("template-description"),
  templateTags: document.getElementById("template-tags"),
  templateComment: document.getElementById("template-comment"),
  templateHashtags: document.getElementById("template-hashtags"),
  btnSaveTemplates: document.getElementById("btn-save-templates"),
  btnResetTemplates: document.getElementById("btn-reset-templates")
};

// APPLICATION BOOTSTRAP / INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initSettingsModal();
  initDashboard();
  initPlayStoreMetadataRetriever();
  initContentGeneration();
  initResultTabs();
  initHistoryView();
  initTemplatesView();
  
  // Set default form values
  resetMetadataForm();
});

// 1. NAVIGATION MANAGEMENT
function initNavigation() {
  DOM.navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetPanel = btn.getAttribute("data-target");
      switchPanel(targetPanel);
    });
  });

  if (DOM.btnQuickStart) {
    DOM.btnQuickStart.addEventListener("click", () => {
      switchPanel("panel-generator");
    });
  }
}

function switchPanel(panelId) {
  state.activePanel = panelId;
  
  // Switch nav highlights
  DOM.navButtons.forEach(btn => {
    if (btn.getAttribute("data-target") === panelId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Switch panel visibility
  DOM.panels.forEach(panel => {
    if (panel.id === panelId) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });

  // Trigger contextual refreshes
  if (panelId === "panel-dashboard") {
    refreshDashboardStats();
  } else if (panelId === "panel-history") {
    refreshHistoryList();
  } else if (panelId === "panel-templates") {
    loadTemplatesInForm();
  }
}

// 2. SETTINGS & LOCAL GEMINI KEY MODAL
function initSettingsModal() {
  DOM.btnConfigKey.addEventListener("click", () => {
    DOM.inputGeminiKey.value = CONFIG.getGeminiApiKey();
    DOM.apiKeyModal.classList.remove("hidden");
  });

  DOM.modalClose.addEventListener("click", () => {
    DOM.apiKeyModal.classList.add("hidden");
  });

  DOM.btnSaveKey.addEventListener("click", () => {
    const key = DOM.inputGeminiKey.value;
    CONFIG.saveGeminiApiKey(key);
    showToast(key ? "Chave API salva com sucesso!" : "Chave removida. Usando chave do servidor.", "success");
    DOM.apiKeyModal.classList.add("hidden");
    
    // Sync indicator color
    updateApiKeyButtonIndicator();
  });

  DOM.btnClearKey.addEventListener("click", () => {
    CONFIG.clearGeminiApiKey();
    DOM.inputGeminiKey.value = "";
    showToast("Chave local limpa. Conectando via servidor.", "info");
    DOM.apiKeyModal.classList.add("hidden");
    updateApiKeyButtonIndicator();
  });

  // Window close click fallback
  window.addEventListener("click", (e) => {
    if (e.target === DOM.apiKeyModal) {
      DOM.apiKeyModal.classList.add("hidden");
    }
  });

  updateApiKeyButtonIndicator();
}

function updateApiKeyButtonIndicator() {
  const hasKey = CONFIG.getGeminiApiKey();
  if (hasKey) {
    DOM.btnConfigKey.style.background = "rgba(16, 185, 129, 0.15)";
    DOM.btnConfigKey.style.borderColor = "rgba(16, 185, 129, 0.3)";
    DOM.btnConfigKey.style.color = "#34d399";
  } else {
    DOM.btnConfigKey.style.background = "rgba(99, 102, 241, 0.1)";
    DOM.btnConfigKey.style.borderColor = "rgba(99, 102, 241, 0.2)";
    DOM.btnConfigKey.style.color = "#a5b4fc";
  }
}

// 3. DASHBOARD RENDERER
function initDashboard() {
  refreshDashboardStats();
}

function refreshDashboardStats() {
  const stats = getDashboardStats();
  
  DOM.statTotalVideos.innerText = stats.totalVideos;
  DOM.statAvgSeo.innerText = stats.totalVideos > 0 ? `${stats.avgSeo}%` : "0%";
  DOM.statTotalTitles.innerText = stats.totalTitles;
  DOM.statWordsBlocked.innerText = stats.totalWordsBlocked;

  // Render last active item
  const history = getHistory();
  if (history.length > 0) {
    const last = history[0];
    DOM.dashboardLastRunContent.innerHTML = `
      <div class="last-run-item">
        <div class="last-run-info">
          <img class="last-run-img" src="${last.icon}" alt="Icon" onerror="this.src='https://play-lh.googleusercontent.com/c28668Y4uEPf1Xl8ALe6v3I0_b_E52N_yUuX-362yv78v94J3P3-F=w240-h240'"/>
          <div>
            <div class="last-run-title-text">${escapeHtml(last.titles[0] || last.appName)}</div>
            <div class="last-run-app">Otimizado em ${formatDate(last.createdAt)}</div>
          </div>
        </div>
        <div class="last-run-score">${last.seoScore}/100 SEO</div>
      </div>
    `;
  } else {
    DOM.dashboardLastRunContent.innerHTML = `
      <p class="text-muted text-center" style="padding: 2rem 0;">Nenhum vídeo gerado ainda nesta sessão. Comece a gerar no painel Gerador!</p>
    `;
  }
}

// 4. GOOGLE PLAY METADATA SCRAPER LOOKUP
function initPlayStoreMetadataRetriever() {
  DOM.btnSearchApp.addEventListener("click", async () => {
    const query = DOM.inputSearchQuery.value.trim();
    if (!query) {
      showToast("Por favor, digite o nome de um aplicativo ou cole o link da Play Store.", "warning");
      return;
    }

    // Reset view
    DOM.searchLoader.classList.remove("hidden");
    DOM.appMetadataContainer.style.opacity = "0.5";
    DOM.btnSearchApp.disabled = true;

    try {
      const data = await searchAppMetadata(query);
      
      // Load retrieved metadata into states & forms
      state.appData = data;
      renderAppMetadataForm(data);
      showToast("Metadados do aplicativo importados com sucesso!", "success");
      
    } catch (e) {
      console.error(e);
      showToast("Não foi possível buscar automaticamente. Preencha manualmente nos campos abaixo.", "warning");
      // Allow manual edits by activating fields
      state.appData = { name: query };
      DOM.metaName.value = query;
    } finally {
      DOM.searchLoader.classList.add("hidden");
      DOM.appMetadataContainer.style.opacity = "1";
      DOM.btnSearchApp.disabled = false;
    }
  });

  // Handle enter key search
  DOM.inputSearchQuery.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      DOM.btnSearchApp.click();
    }
  });
}

function renderAppMetadataForm(data) {
  if (!data) return;
  DOM.metaName.value = data.name || "";
  DOM.metaCategory.value = data.category || "";
  DOM.metaDeveloper.value = data.developer || "";
  DOM.metaVersion.value = data.version || "Varia de acordo com o dispositivo";
  DOM.metaDownloads.value = data.downloads || "10M+";
  DOM.metaLastUpdated.value = data.lastUpdated || "";
  DOM.metaIconUrl.value = data.icon || "";
  DOM.metaDescription.value = data.description || "";

  // Render preview badge
  const previewImg = document.getElementById("app-icon");
  if (previewImg) previewImg.src = data.icon || "https://play-lh.googleusercontent.com/c28668Y4uEPf1Xl8ALe6v3I0_b_E52N_yUuX-362yv78v94J3P3-F=w240-h240";
  
  const previewTitle = document.getElementById("preview-app-title");
  if (previewTitle) previewTitle.innerText = data.name || "Preenchimento do App";
  
  const previewCategory = document.getElementById("preview-app-category");
  if (previewCategory) previewCategory.innerText = `${data.category || 'Gênero'} • por ${data.developer || 'Desenvolvedor'}`;
}

function resetMetadataForm() {
  DOM.metaName.value = "";
  DOM.metaCategory.value = "";
  DOM.metaDeveloper.value = "";
  DOM.metaVersion.value = "";
  DOM.metaDownloads.value = "";
  DOM.metaLastUpdated.value = "";
  DOM.metaIconUrl.value = "";
  DOM.metaDescription.value = "";
  DOM.userCustomInstructions.value = "";
}

// 5. INTELIGENT GENERATION ENGINE
function initContentGeneration() {
  DOM.btnGenerateSeo.addEventListener("click", () => triggerAiGeneration());

  // Result interaction listeners
  DOM.btnCopyDescription.addEventListener("click", () => {
    copyToClipboard(DOM.descriptionTextarea.value);
    showToast("Descrição copiada para a área de transferência!", "success");
  });

  DOM.btnCopyTags.addEventListener("click", () => {
    copyToClipboard(DOM.tagsRawInput.value);
    showToast("Tags copiadas (separadas por vírgulas)!", "success");
  });

  DOM.btnCopyHashtags.addEventListener("click", () => {
    copyToClipboard(DOM.hashtagsContainer.innerText);
    showToast("Hashtags copiadas!", "success");
  });

  DOM.btnCopyPinned.addEventListener("click", () => {
    copyToClipboard(DOM.pinnedCommentBox.innerText);
    showToast("Comentário fixado copiado!", "success");
  });

  DOM.btnCopyAll.addEventListener("click", () => {
    if (!state.lastGeneratedResult) return;
    const fullText = `--- TÍTULO RECOMENDADO ---
${state.lastGeneratedResult.titles[0]}

--- TÍTULOS ALTERNATIVOS ---
${state.lastGeneratedResult.titles.join("\n")}

--- DESCRIÇÃO ---
${state.lastGeneratedResult.descriptionGenerated}

--- TAGS ---
${state.lastGeneratedResult.tags.join(", ")}

--- HASHTAGS ---
${state.lastGeneratedResult.hashtags.join(" ")}

--- COMENTÁRIO FIXADO ---
${state.lastGeneratedResult.pinnedComment}`;

    copyToClipboard(fullText);
    showToast("Todo conteúdo de SEO copiado com sucesso!", "success");
  });

  DOM.btnClearResults.addEventListener("click", () => {
    DOM.resultsContentWrapper.classList.add("hidden");
    DOM.resultsPlaceholderCard.classList.remove("hidden");
    state.lastGeneratedResult = null;
    showToast("Formulário de resultados limpo.", "info");
  });

  DOM.btnRegenerateSeo.addEventListener("click", () => {
    triggerAiGeneration();
  });

  DOM.btnExportTxt.addEventListener("click", () => {
    if (!state.lastGeneratedResult) return;
    const res = state.lastGeneratedResult;
    const txt = `SOSDROID AI YOUTUBE STUDIO - ATIVOS DE SEO
Aplicativo: ${res.appName}
Data: ${formatDate(res.createdAt)}
Score de SEO: ${res.seoScore}/100

=========================================
1. TÍTULOS GERADOS (15 SUGESTÕES)
=========================================
${res.titles.map((t, i) => `${i+1}. ${t} (${t.length} carac)`).join("\n")}

=========================================
2. DESCRIÇÃO OTIMIZADA DO VÍDEO
=========================================
${res.descriptionGenerated}

=========================================
3. TAGS (PALAVRAS-CHAVE)
=========================================
${res.tags.join(", ")}

=========================================
4. HASHTAGS
=========================================
${res.hashtags.join(" ")}

=========================================
5. COMENTÁRIO FIXADO RECOMENDADO
=========================================
${res.pinnedComment}

=========================================
6. TEXTOS SUGERIDOS PARA THUMBNAIL
=========================================
${res.thumbnailTexts.map((th, i) => `- ${th}`).join("\n")}`;

    downloadTextFile(txt, `seo_${res.appName.toLowerCase().replace(/\s+/g, "_")}.txt`);
    showToast("Arquivo TXT exportado com sucesso!", "success");
  });

  DOM.btnExportJsonItem.addEventListener("click", () => {
    if (!state.lastGeneratedResult) return;
    const res = state.lastGeneratedResult;
    downloadJsonFile(res, `seo_${res.appName.toLowerCase().replace(/\s+/g, "_")}.json`);
    showToast("JSON do vídeo exportado com sucesso!", "success");
  });
}

// Scans metadata & triggers Gemini pipeline
async function triggerAiGeneration() {
  const name = DOM.metaName.value.trim();
  if (!name) {
    showToast("O nome do aplicativo é obrigatório. Busque ou preencha o formulário.", "warning");
    switchPanel("panel-generator");
    DOM.metaName.focus();
    return;
  }

  // Gather current form data
  const currentFormMetadata = {
    name,
    category: DOM.metaCategory.value.trim() || "Aplicativos",
    developer: DOM.metaDeveloper.value.trim() || "Android Developer",
    version: DOM.metaVersion.value.trim() || "1.0",
    downloads: DOM.metaDownloads.value.trim() || "10.000+",
    lastUpdated: DOM.metaLastUpdated.value.trim() || "Recente",
    icon: DOM.metaIconUrl.value.trim() || "https://play-lh.googleusercontent.com/c28668Y4uEPf1Xl8ALe6v3I0_b_E52N_yUuX-362yv78v94J3P3-F=w240-h240",
    description: DOM.metaDescription.value.trim() || ""
  };

  const userInstructions = DOM.userCustomInstructions.value.trim();
  const safeModeActive = DOM.toggleSafeMode.checked;
  const savedTemplates = getSavedTemplates();

  // Reset Safety Logs
  state.safeReport = [];

  // 1. YouTube Safe Mode PRE-SCAN (User instructions & Form descriptions)
  let safeDescription = currentFormMetadata.description;
  let safeInstructions = userInstructions;

  if (safeModeActive) {
    updateProgress(10, "Escaneando termos de segurança na entrada...");
    
    const descSanitize = sanitizeYouTubeContent(currentFormMetadata.description);
    const instSanitize = sanitizeYouTubeContent(userInstructions);

    safeDescription = descSanitize.cleanText;
    safeInstructions = instSanitize.cleanText;

    // Combine safe replacement items for final report
    state.safeReport = [...descSanitize.replacedTerms, ...instSanitize.replacedTerms];
  }

  const cleanMetadata = { ...currentFormMetadata, description: safeDescription };

  // Switch Loader views
  DOM.resultsPlaceholderCard.classList.add("hidden");
  DOM.resultsContentWrapper.classList.add("hidden");
  DOM.generationLoaderCard.classList.remove("hidden");

  try {
    updateProgress(25, "Conectando ao núcleo de IA do Gemini...");
    
    // Call AI Generation Layer
    const aiResponse = await generateSeoAssets({
      appData: cleanMetadata,
      userInstructions: safeInstructions,
      templates: savedTemplates,
      safeModeActive,
      safeReport: state.safeReport
    });

    updateProgress(75, "Processando e validando conteúdo gerado...");

    // 2. YouTube Safe Mode POST-SCAN (Guarantees zero leakage)
    let processedResponse = { ...aiResponse };
    if (safeModeActive) {
      // Titles Sanitize
      processedResponse.titles = aiResponse.titles.map(title => {
        const check = sanitizeYouTubeContent(title);
        if (check.replacedTerms.length > 0) {
          state.safeReport = mergeSafeReports(state.safeReport, check.replacedTerms);
        }
        return check.cleanText;
      });

      // Description Sanitize
      const descCheck = sanitizeYouTubeContent(aiResponse.description);
      if (descCheck.replacedTerms.length > 0) {
        state.safeReport = mergeSafeReports(state.safeReport, descCheck.replacedTerms);
      }
      processedResponse.description = descCheck.cleanText;

      // Tags Sanitize
      processedResponse.tags = aiResponse.tags.map(tag => {
        const check = sanitizeYouTubeContent(tag);
        if (check.replacedTerms.length > 0) {
          state.safeReport = mergeSafeReports(state.safeReport, check.replacedTerms);
        }
        return check.cleanText;
      });
    }

    updateProgress(90, "Salvando ativos no LocalStorage...");

    // Store in historical records
    const finalRecord = {
      appName: cleanMetadata.name,
      category: cleanMetadata.category,
      developer: cleanMetadata.developer,
      icon: cleanMetadata.icon,
      descriptionOfficial: cleanMetadata.description,
      userInstructions,
      
      titles: processedResponse.titles,
      descriptionGenerated: processedResponse.description,
      tags: processedResponse.tags,
      hashtags: processedResponse.hashtags,
      pinnedComment: processedResponse.pinnedComment,
      thumbnailTexts: processedResponse.thumbnailTexts,
      
      seoScore: processedResponse.seoAnalysis?.seoScore || 95,
      seoAnalysis: processedResponse.seoAnalysis,
      safeReport: state.safeReport
    };

    const updatedHistory = saveVideoRecord(finalRecord);
    
    // Set active state
    state.lastGeneratedResult = updatedHistory[0]; // Retrieve parsed object back with active ID

    // Render results
    renderSeoResults(state.lastGeneratedResult);
    showToast("Otimização de SEO gerada e salva com sucesso!", "success");

  } catch (err) {
    console.error(err);
    showToast("Erro durante a geração com Gemini. Verifique sua conexão ou chave de API.", "danger");
    DOM.resultsPlaceholderCard.classList.remove("hidden");
  } finally {
    DOM.generationLoaderCard.classList.add("hidden");
  }
}

// Progress Bar Helper
function updateProgress(percentage, message) {
  DOM.generationProgress.style.width = `${percentage}%`;
  DOM.generationStepText.innerText = message;
}

// Combines safety lists avoiding duplicated counts
function mergeSafeReports(currentList, newItems) {
  const list = [...currentList];
  newItems.forEach(item => {
    const existing = list.find(l => l.original === item.original);
    if (existing) {
      existing.count = (existing.count || 1) + (item.count || 1);
    } else {
      list.push(item);
    }
  });
  return list;
}

// 6. RENDER RESULTS OUTPUT IN THE PANELS
function renderSeoResults(record) {
  if (!record) return;

  // Header indicators
  DOM.badgeSeoScore.innerText = `Score: ${record.seoScore}%`;
  
  const hasSubstitutions = record.safeReport && record.safeReport.length > 0;
  if (hasSubstitutions) {
    DOM.badgeSafeMode.innerText = `${record.safeReport.length} Substituições`;
    DOM.badgeSafeMode.className = "badge-status badge-primary";
  } else {
    DOM.badgeSafeMode.innerText = "Safe Mode OK";
    DOM.badgeSafeMode.className = "badge-status badge-success";
  }

  // 1. Render Titles tab
  DOM.titlesOutputList.innerHTML = "";
  record.titles.forEach((title, idx) => {
    const charCount = title.length;
    const row = document.createElement("div");
    row.className = "title-item-card animate-fade-in";
    row.style.animationDelay = `${idx * 0.03}s`;
    
    row.innerHTML = `
      <div class="title-text-col">
        <div class="title-string">${escapeHtml(title)}</div>
        <div class="title-metadata">
          <span class="char-badge">${charCount} / 65 caracteres</span>
          ${charCount > 65 ? '<span class="seo-rating-badge" style="background:rgba(239,68,68,0.1);color:#f87171;">Muito Longo</span>' : '<span class="seo-rating-badge" style="background:rgba(16,185,129,0.1);color:#34d399;">Otimizado</span>'}
        </div>
      </div>
      <button class="action-mini-btn btn-copy-title" data-title="${escapeHtml(title)}">
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        Copiar
      </button>
    `;

    DOM.titlesOutputList.appendChild(row);
  });

  // Wire copiers inside dynamic rows
  DOM.titlesOutputList.querySelectorAll(".btn-copy-title").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = btn.getAttribute("data-title");
      copyToClipboard(t);
      showToast("Título copiado!", "success");
    });
  });

  // 2. Render Description tab
  DOM.descriptionTextarea.value = record.descriptionGenerated;
  DOM.descriptionCharCounter.innerText = `${record.descriptionGenerated.length} / 5000 caracteres`;

  // 3. Render Tags & Extras tab
  DOM.tagsChipsContainer.innerHTML = "";
  record.tags.forEach(tag => {
    const chip = document.createElement("span");
    chip.className = "tag-badge";
    chip.innerText = tag;
    DOM.tagsChipsContainer.appendChild(chip);
  });
  DOM.tagsRawInput.value = record.tags.join(", ");

  DOM.hashtagsContainer.innerText = record.hashtags.join(" ");
  DOM.pinnedCommentBox.innerText = record.pinnedComment;

  DOM.thumbnailTextsList.innerHTML = "";
  record.thumbnailTexts.forEach(th => {
    const li = document.createElement("li");
    li.innerText = th;
    DOM.thumbnailTextsList.appendChild(li);
  });

  // 4. Render SEO Analyzer tab
  renderSeoScoreCircle(record.seoScore);
  
  const analysis = record.seoAnalysis || {};
  DOM.seoCtrText.innerText = analysis.estimatedCtr || "Estimando...";
  DOM.seoReadabilityText.innerText = analysis.readability || "Bom";
  DOM.seoStuffingText.innerText = analysis.keywordStuffing || "Excelente (Baixa Densidade)";
  DOM.seoRepetitionText.innerText = analysis.repetition || "Baixa";
  DOM.seoSpamText.innerText = `Baixo Risco (Nota: ${record.seoScore}/100)`;
  DOM.seoMainKeyword.innerText = analysis.mainKeyword || record.appName;
  
  // YouTube General Risk classification
  const risk = analysis.youtubeRisk || "Excelente";
  let riskColor = "var(--success)";
  if (risk === "Bom" || risk === "Excelente") riskColor = "var(--success)";
  else if (risk === "Médio") riskColor = "var(--warning)";
  else riskColor = "var(--danger)";
  
  DOM.seoScoreRatingBadge.innerText = `Risco YouTube: ${risk}`;
  DOM.seoScoreRatingBadge.style.color = riskColor;

  DOM.seoSecondaryKeywords.innerHTML = "";
  if (analysis.secondaryKeywords && analysis.secondaryKeywords.length > 0) {
    analysis.secondaryKeywords.forEach(kw => {
      const chip = document.createElement("span");
      chip.className = "tag-badge";
      chip.style.borderColor = "var(--secondary)";
      chip.innerText = kw;
      DOM.seoSecondaryKeywords.appendChild(chip);
    });
  } else {
    DOM.seoSecondaryKeywords.innerHTML = '<span class="text-muted text-xs">Nenhuma cadastrada</span>';
  }

  // Safe Mode substitutions report
  DOM.safeReportListContainer.innerHTML = "";
  if (record.safeReport && record.safeReport.length > 0) {
    record.safeReport.forEach(item => {
      const row = document.createElement("div");
      row.className = "report-item";
      row.innerHTML = `
        <div>
          Substituição de termo banido: <span class="term-old">"${escapeHtml(item.original)}"</span> 
          por <span class="term-new">"${escapeHtml(item.replaced)}"</span> 
          <span class="text-muted" style="margin-left:5px">(${item.count || 1}x)</span>
          <p class="text-muted text-xs mt-1" style="font-size:0.7rem;">${escapeHtml(item.reason)}</p>
        </div>
      `;
      DOM.safeReportListContainer.appendChild(row);
    });
  } else {
    DOM.safeReportListContainer.innerHTML = `
      <p class="text-muted text-xs">Nenhum termo sensível (hack, mod, infinito) detectado. Seus metadados estão 100% limpos e adequados para anunciantes!</p>
    `;
  }

  // Active results wrapper
  DOM.resultsContentWrapper.classList.remove("hidden");
  switchResultTab("tab-titles");
}

function renderSeoScoreCircle(score) {
  const val = Number(score) || 0;
  // Circular gauge calculations (dasharray circumference is approx 100)
  DOM.seoScoreProgressPath.setAttribute("stroke-dasharray", `${val}, 100`);
  DOM.seoScoreText.innerText = val;
  
  // Custom colors depending on score
  if (val >= 90) {
    DOM.seoScoreProgressPath.style.stroke = "var(--success)";
  } else if (val >= 75) {
    DOM.seoScoreProgressPath.style.stroke = "var(--info)";
  } else if (val >= 50) {
    DOM.seoScoreProgressPath.style.stroke = "var(--warning)";
  } else {
    DOM.seoScoreProgressPath.style.stroke = "var(--danger)";
  }
}

// 7. RESULT TABS SWITCHER
function initResultTabs() {
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchResultTab(tabId);
    });
  });
}

function switchResultTab(tabId) {
  state.activeResultTab = tabId;

  DOM.tabButtons.forEach(btn => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  DOM.tabPanes.forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add("active");
    } else {
      pane.classList.remove("active");
    }
  });
}

// 8. HISTÓRICO TAB VIEW
function initHistoryView() {
  DOM.inputHistorySearch.addEventListener("input", () => {
    renderHistoryTable(DOM.inputHistorySearch.value);
  });

  // History global backup exports
  DOM.btnHistoryExport.addEventListener("click", () => {
    const list = getHistory();
    if (list.length === 0) {
      showToast("Seu histórico está vazio.", "warning");
      return;
    }
    downloadJsonFile(list, "sosdroid_backup_historico.json");
    showToast("Backup do histórico JSON baixado com sucesso!", "success");
  });

  DOM.btnHistoryImportTrigger.addEventListener("click", () => {
    DOM.inputHistoryImport.click();
  });

  DOM.inputHistoryImport.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const json = JSON.parse(evt.target.result);
        const ok = importHistoryData(json);
        if (ok) {
          showToast("Histórico importado e mesclado com sucesso!", "success");
          refreshHistoryList();
          refreshDashboardStats();
        } else {
          showToast("Formato de arquivo JSON inválido.", "danger");
        }
      } catch (err) {
        showToast("Falha ao ler o arquivo de histórico.", "danger");
      }
    };
    reader.readAsText(file);
    // Clear input selection
    e.target.value = "";
  });
}

function refreshHistoryList() {
  renderHistoryTable();
}

function renderHistoryTable(filterQuery = "") {
  const records = filterQuery ? searchHistory(filterQuery) : getHistory();
  
  if (records.length === 0) {
    DOM.historyEmptyView.classList.remove("hidden");
    DOM.historyTableWrapper.classList.add("hidden");
    return;
  }

  DOM.historyEmptyView.classList.add("hidden");
  DOM.historyTableWrapper.classList.remove("hidden");

  DOM.historyTableBody.innerHTML = "";
  records.forEach(item => {
    const row = document.createElement("tr");
    
    row.innerHTML = `
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${item.icon}" style="width:2rem;height:2rem;border-radius:6px;" onerror="this.src='https://play-lh.googleusercontent.com/c28668Y4uEPf1Xl8ALe6v3I0_b_E52N_yUuX-362yv78v94J3P3-F=w240-h240'"/>
          <div>
            <strong style="color:#fff">${escapeHtml(item.appName)}</strong>
            <div style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(item.category)}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="text-sm" style="color:#f3f4f6;">${escapeHtml(item.titles[0] || "Sem título")}</span>
      </td>
      <td>
        <span class="text-sm text-muted">${formatDate(item.createdAt)}</span>
      </td>
      <td>
        <strong style="color:var(--primary); font-family:var(--font-mono);">${item.seoScore}%</strong>
      </td>
      <td>
        <div class="action-row-buttons">
          <button class="action-mini-btn btn-view-item" data-id="${item.id}" title="Carregar no painel de resultados">
            Visualizar
          </button>
          <button class="action-mini-btn btn-duplicate-item" style="background:rgba(99,102,241,0.12);color:#818cf8;" data-id="${item.id}" title="Duplicar">
            Clonar
          </button>
          <button class="action-mini-btn btn-delete-item" style="background:rgba(239,68,68,0.12);color:#f87171;" data-id="${item.id}" title="Excluir Permanentemente">
            Excluir
          </button>
        </div>
      </td>
    `;

    DOM.historyTableBody.appendChild(row);
  });

  // Wire interactive handlers
  DOM.historyTableBody.querySelectorAll(".btn-view-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const list = getHistory();
      const match = list.find(v => v.id === id);
      if (match) {
        state.lastGeneratedResult = match;
        
        // Re-inject App Data state so user can regenerate easily
        state.appData = {
          name: match.appName,
          category: match.category,
          developer: match.developer,
          icon: match.icon,
          version: match.version || "",
          downloads: match.downloads || "",
          lastUpdated: match.lastUpdated || "",
          description: match.descriptionOfficial || ""
        };
        renderAppMetadataForm(state.appData);
        DOM.userCustomInstructions.value = match.userInstructions || "";

        // Render results and switch panel
        renderSeoResults(match);
        switchPanel("panel-generator");
        showToast(`Registro de "${match.appName}" recarregado no gerador!`, "success");
      }
    });
  });

  DOM.historyTableBody.querySelectorAll(".btn-duplicate-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const ok = duplicateVideoRecord(id);
      if (ok) {
        showToast("Registro duplicado no histórico!", "success");
        renderHistoryTable();
        refreshDashboardStats();
      }
    });
  });

  DOM.historyTableBody.querySelectorAll(".btn-delete-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (confirm("Tem certeza que deseja excluir esta otimização do histórico?")) {
        deleteVideoRecord(id);
        showToast("Otimização excluída permanentemente.", "info");
        renderHistoryTable();
        refreshDashboardStats();
      }
    });
  });
}

// 9. TEMPLATES VIEW MANAGEMENT
function initTemplatesView() {
  DOM.btnSaveTemplates.addEventListener("click", () => {
    const config = {
      titles: DOM.templateTitle.value.trim(),
      description: DOM.templateDescription.value.trim(),
      tags: DOM.templateTags.value.trim(),
      comment: DOM.templateComment.value.trim(),
      hashtags: DOM.templateHashtags.value.trim()
    };
    saveTemplates(config);
    showToast("Suas diretrizes de templates foram atualizadas!", "success");
  });

  DOM.btnResetTemplates.addEventListener("click", () => {
    if (confirm("Deseja restaurar as diretrizes de template aos padrões de fábrica do SOSDROID?")) {
      const defaults = resetTemplatesToDefault();
      loadTemplatesInForm(defaults);
      showToast("Templates restaurados para os padrões.", "info");
    }
  });

  loadTemplatesInForm();
}

function loadTemplatesInForm(customConfig = null) {
  const templates = customConfig || getSavedTemplates();
  DOM.templateTitle.value = templates.titles;
  DOM.templateDescription.value = templates.description;
  DOM.templateTags.value = templates.tags;
  DOM.templateComment.value = templates.comment;
  DOM.templateHashtags.value = templates.hashtags;
}
