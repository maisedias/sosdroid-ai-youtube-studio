/**
 * SOSDROID AI YOUTUBE STUDIO - GEMINI CLIENT SERVICE
 * Dual-channel network layer. Routes requests through the Express backend proxy by default,
 * or falls back to direct client-side Google API REST calls if a personal API key is defined in standalone mode.
 */

import { CONFIG } from "./config.js";

/**
 * Searches and retrieves play store metadata.
 * @param {string} query - App name or Play Store URL.
 * @returns {Promise<object>} The app metadata object.
 */
export async function searchAppMetadata(query) {
  const localKey = CONFIG.getGeminiApiKey();
  
  // If no local key is set, or if we want to prioritize our Express backend
  if (!localKey) {
    try {
      const response = await fetch(CONFIG.apiEndpoints.playStore, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao buscar informações.");
      }

      const resData = await response.json();
      return resData.data;
    } catch (e) {
      console.warn("Backend metadata search failed, attempting standalone mock fallback:", e);
      throw e;
    }
  }

  // Standalone Mode: Client-side fetch directly to Google Gemini REST API using the user's local key
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${localKey}`;
    
    const prompt = `Retorne os metadados para o app/jogo Android "${query}" em JSON. Se for um link da Play Store, extraia o nome inteligível e forneça informações plausíveis se reais não estiverem disponíveis.`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [{
          text: `Você é um recuperador de metadados da Play Store. Retorne exclusivamente um objeto JSON correspondente a este schema:
{
  "name": "Nome do app",
  "icon": "URL de ícone representativo (ex: https://images.unsplash.com/photo-... ou URL padrão)",
  "category": "Gênero",
  "developer": "Desenvolvedor",
  "description": "Descrição detalhada (mínimo 3 parágrafos)",
  "lastUpdated": "Data recente de atualização (ex: 15 de Junho de 2026)",
  "version": "Versão recente",
  "downloads": "Estimativa de Downloads"
}`
        }]
      },
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Erro na API direta do Gemini.");
    }

    const resJson = await response.json();
    const textOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return JSON.parse(textOutput.trim());
  } catch (err) {
    console.error("Direct API metadata fetch failed:", err);
    throw new Error("Não foi possível obter dados. Verifique sua Chave API Gemini.");
  }
}

/**
 * Generates SEO YouTube assets (Titles, Description, Tags, Comment, Hashtags, and SEO Score).
 * @param {object} params - Object containing all variables needed.
 * @returns {Promise<object>} The generated JSON assets.
 */
export async function generateSeoAssets(params) {
  const localKey = CONFIG.getGeminiApiKey();

  // Full-Stack Proxy Path
  if (!localKey) {
    const response = await fetch(CONFIG.apiEndpoints.generate, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro de geração no servidor.");
    }

    const resData = await response.json();
    return resData.result;
  }

  // Direct Standalone Client-Side Path
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${localKey}`;
    
    const promptText = `Gere SEO de alta performance para o aplicativo:
Nome: ${params.appData.name}
Categoria: ${params.appData.category}
Desenvolvedor: ${params.appData.developer}
Descrição: ${params.appData.description}
Versão: ${params.appData.version}

Instruções extras do usuário: ${params.userInstructions || "Nenhuma"}
Templates personalizados: ${JSON.stringify(params.templates)}
Safe Mode Ativo: ${params.safeModeActive ? "SIM" : "NÃO"}.
Relatório de termos alterados antes da IA: ${JSON.stringify(params.safeReport || [])}`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: {
        parts: [{
          text: `Você é um especialista em SEO de YouTube para nicho de jogos/apps Android. Retorne um JSON rigoroso em português:
{
  "titles": ["exatamente 15 títulos de até 65 caracteres"],
  "description": "descrição original longa terminando com o bloco de assinatura SOSDROID",
  "tags": ["20 a 30 tags separadas"],
  "hashtags": ["exatamente 3 hashtags começadas com #"],
  "pinnedComment": "comentário fixado sugestivo",
  "thumbnailTexts": ["5 sugestões de até 3 palavras"],
  "seoAnalysis": {
    "seoScore": 95,
    "estimatedCtr": "Excelente (8.5% - 12%)",
    "readability": "Fácil / Excelente",
    "keywordStuffing": "Nenhum risco detectado",
    "repetition": "Baixa",
    "youtubeRisk": "Excelente",
    "mainKeyword": "palavra-chave principal",
    "secondaryKeywords": ["palavra-chave 1", "palavra-chave 2"]
  }
}`
        }]
      },
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Erro na geração direta.");
    }

    const resJson = await response.json();
    const textOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return JSON.parse(textOutput.trim());
  } catch (err) {
    console.error("Direct API generation fetch failed:", err);
    throw new Error("Erro de processamento da IA direta. Verifique sua chave.");
  }
}
