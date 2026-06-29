/**
 * SOSDROID AI YOUTUBE STUDIO - TEMPLATES MODULE
 * Configures default and saved templates for Titles, Descriptions, Tags, Comments, and Hashtags.
 * Synchronizes instantly with LocalStorage.
 */

// Default SEO Templates for SOSDROID standard
export const DEFAULT_TEMPLATES = {
  titles: "Títulos com alta taxa de clique (CTR), usando ganchos de curiosidade e benefícios claros, em português natural. Máximo de 65 caracteres. Use emojis de forma sutil.",
  
  description: `📱 INFORMAÇÕES DO VÍDEO

[Gere uma introdução humana, original e empolgante descrevendo a gameplay, recursos e detalhes técnicos do jogo ou aplicativo. Não copie a Play Store.]

━━━━━━━━━━━━━━━━━━
✅ Inscreva-se
🔔 Ative as notificações
👍 Deixe seu like
📤 Compartilhe este vídeo

🌐 Blog Oficial
https://sosdroidyoutube.blogspot.com/

📩 Contato Comercial
sosdroidoficial@gmail.com

© SOSDROID OFICIAL
━━━━━━━━━━━━━━━━━━`,

  tags: "Tags de cauda longa e cauda curta altamente pesquisadas, sem repetições, cobrindo o nome do jogo, termos de gameplay, dicas, tutorial, download, celular, e português.",
  
  comment: "Escreva um comentário fixado oficial e interativo com chamada para ação, incentivando o público a se inscrever, comentar sobre seu nível no jogo ou dar feedback.",
  
  hashtags: "#sosdroid #jogosandroid #gameplay"
};

/**
 * Retrieves the currently saved templates from LocalStorage,
 * falling back to defaults if empty.
 * @returns {object} The active template configuration.
 */
export function getSavedTemplates() {
  const saved = localStorage.getItem("sosdroid_seo_templates");
  if (!saved) {
    return { ...DEFAULT_TEMPLATES };
  }
  try {
    const parsed = JSON.parse(saved);
    // Ensure all keys exist
    return {
      titles: parsed.titles || DEFAULT_TEMPLATES.titles,
      description: parsed.description || DEFAULT_TEMPLATES.description,
      tags: parsed.tags || DEFAULT_TEMPLATES.tags,
      comment: parsed.comment || DEFAULT_TEMPLATES.comment,
      hashtags: parsed.hashtags || DEFAULT_TEMPLATES.hashtags
    };
  } catch (e) {
    console.error("Failed to parse templates, using defaults:", e);
    return { ...DEFAULT_TEMPLATES };
  }
}

/**
 * Saves a new template configuration to LocalStorage.
 * @param {object} templates - Template config to save.
 */
export function saveTemplates(templates) {
  if (!templates) return;
  localStorage.setItem("sosdroid_seo_templates", JSON.stringify(templates));
}

/**
 * Resets templates back to factory default.
 * @returns {object} Default template config.
 */
export function resetTemplatesToDefault() {
  localStorage.removeItem("sosdroid_seo_templates");
  return { ...DEFAULT_TEMPLATES };
}
