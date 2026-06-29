import express from "express";
import path from "path";
import dotenv from "dotenv";
import https from "https";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Lazy initialization of Gemini API
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Resilient HTTPS get helper with browser headers
function resilientGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "max-age=0"
      },
      timeout: 10000
    };
    
    const req = https.get(url, options, (res) => {
      // Handle redirects (status 301, 302, 307, 308)
      if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith("http") 
          ? res.headers.location 
          : new URL(res.headers.location, url).toString();
        resilientGet(redirectUrl).then(resolve).catch(reject);
        return;
      }

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data);
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

// Local smart fallback generator in case everything fails
const getLocalFallbackData = (q: string) => {
  let cleanName = q;
  if (q.includes("details?id=")) {
    const idMatch = q.match(/id=([a-zA-Z0-9._]+)/);
    if (idMatch && idMatch[1]) {
      const parts = idMatch[1].split(".");
      cleanName = parts[parts.length - 1];
    }
  } else if (q.includes(".")) {
    const parts = q.split(".");
    cleanName = parts[parts.length - 1];
  }

  cleanName = cleanName
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();

  if (!cleanName) cleanName = "Aplicativo Android";

  let category = "Ferramentas / Utilidades";
  let description = `${cleanName} é um aplicativo incrível para Android que oferece uma experiência otimizada, recursos modernos e interface fácil de usar. Perfeito para usuários que buscam alto desempenho e praticidade no dia a dia.`;
  
  const qLower = q.toLowerCase();
  if (qLower.includes("clash") || qLower.includes("subway") || qLower.includes("game") || qLower.includes("jogo") || qLower.includes("fire") || qLower.includes("run") || qLower.includes("mine") || qLower.includes("craft") || qLower.includes("candy") || qLower.includes("saga") || qLower.includes("battle") || qLower.includes("soccer") || qLower.includes("futebol") || qLower.includes("royale")) {
    category = "Jogos / Entretenimento";
    description = `${cleanName} é um jogo eletrônico de grande sucesso para dispositivos móveis Android. Apresenta jogabilidade viciante, gráficos espetaculares e atualizações frequentes com novos desafios, eventos especiais e recompensas exclusivas.`;
  } else if (qLower.includes("edit") || qLower.includes("photo") || qLower.includes("video") || qLower.includes("imagem") || qLower.includes("camera") || qLower.includes("viva") || qLower.includes("capcut")) {
    category = "Fotografia / Editores de Vídeo";
    description = `${cleanName} é uma ferramenta poderosa de edição criativa para Android, permitindo ajustar fotos, aplicar filtros profissionais, cortar vídeos e criar conteúdos visuais de alta qualidade diretamente pelo celular.`;
  } else if (qLower.includes("note") || qLower.includes("todo") || qLower.includes("agenda") || qLower.includes("notion") || qLower.includes("organizer") || qLower.includes("calendar")) {
    category = "Produtividade / Organização";
    description = `${cleanName} é um organizador pessoal completo projetado para gerenciar tarefas, fazer anotações rápidas, acompanhar metas e aumentar drasticamente sua produtividade e foco ao longo do dia.`;
  }

  return {
    name: cleanName,
    icon: "https://play-lh.googleusercontent.com/c28668Y4uEPf1Xl8ALe6v3I0_b_E52N_yUuX-362yv78v94J3P3-F=w240-h240",
    category,
    developer: "Android Developer",
    description,
    lastUpdated: "Atualizado recentemente",
    version: "Varia de acordo com o dispositivo",
    downloads: "1M+"
  };
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Search / Fetch Google Play Store app information
  app.post("/api/play-store/search", async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "O parâmetro query é obrigatório." });
    }

    // Helper to extract package ID from Google Play URL or direct input
    const getPackageId = (url: string): string | null => {
      try {
        const match = url.match(/id=([a-zA-Z0-9._]+)/);
        if (match) return match[1];

        // If the query looks like a standard package ID (e.g. com.mojang.minecraftpe)
        if (/^[a-zA-Z0-9._]+$/.test(url) && url.includes(".")) {
          return url;
        }
        return null;
      } catch {
        return null;
      }
    };

    let packageId = getPackageId(query);

    // Dynamic Search Fallback: If no direct packageId is provided (e.g. they typed "Subway Surfers" instead of a URL)
    // We scrape Google Play search results to find the first package ID match
    if (!packageId && query.length > 2) {
      try {
        const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps&hl=pt_BR`;
        const searchHtml = await resilientGet(searchUrl);
        const searchMatch = searchHtml.match(/details\?id=([a-zA-Z0-9._]+)/);
        if (searchMatch && searchMatch[1]) {
          packageId = searchMatch[1];
          console.log(`Found package ID "${packageId}" on Google Play Search for: "${query}"`);
        }
      } catch (searchErr) {
        console.warn("Failed to find app on Google Play via search scraping:", searchErr);
      }
    }

    if (packageId) {
      // Attempt scraping from Play Store details page
      try {
        const playUrl = `https://play.google.com/store/apps/details?id=${packageId}&hl=pt_BR`;
        const html = await resilientGet(playUrl);

        let name = "";
        let icon = "";
        let category = "";
        let developer = "";
        let description = "";
        let lastUpdated = "Recente";
        let version = "Varia de acordo com o dispositivo";
        let downloads = "100.000+";

        // 1. Try parsing JSON-LD microdata - Scan all ld+json blocks to locate the SoftwareApplication type
        try {
          const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^]*?>([\s\S]*?)<\/script>/gi;
          let match;
          while ((match = jsonLdRegex.exec(html)) !== null) {
            try {
              const parsed = JSON.parse(match[1].trim());
              if (parsed) {
                const items = Array.isArray(parsed) ? parsed : [parsed];
                for (const item of items) {
                  if (item["@type"] === "SoftwareApplication" || item.genre || item.image || item.author) {
                    if (item.name) name = item.name;
                    if (item.image) icon = item.image;
                    if (item.genre) category = item.genre;
                    if (item.author?.name) developer = item.author.name;
                    if (item.description) description = item.description;
                  }
                }
              }
            } catch (e) {
              // Ignore parsing errors for other non-related JSON-LD scripts
            }
          }
        } catch (jsonErr) {
          console.warn("JSON-LD parsing failed, trying regular expressions...");
        }

        // 2. Open-Graph & Meta Tags fallbacks
        if (!name) {
          const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || 
                             html.match(/<meta name="twitter:title" content="([^"]+)"/i) ||
                             html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) name = titleMatch[1];
        }
        if (name) {
          name = name.replace(" - Apps no Google Play", "")
                     .replace(" - Apps on Google Play", "")
                     .replace(" – Apps no Google Play", "")
                     .replace(" – Apps on Google Play", "")
                     .split(" - ")[0].trim();
        }

        if (!icon) {
          const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i) || 
                             html.match(/<meta name="twitter:image" content="([^"]+)"/i) ||
                             html.match(/<link rel="image_src" href="([^"]+)"/i) ||
                             html.match(/<img itemprop="image" src="([^"]+)"/i);
          if (imageMatch) icon = imageMatch[1].trim();
        }

        // If no icon found yet, fallback to searching for standard play store icon pattern
        if (!icon) {
          const iconMatch = html.match(/"(https:\/\/play-lh\.googleusercontent\.com\/[a-zA-Z0-9_=-]+)"/);
          if (iconMatch) icon = iconMatch[1];
        }

        if (!description) {
          const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i) || 
                            html.match(/<meta name="description" content="([^"]+)"/i);
          if (descMatch) description = descMatch[1].trim();
        }

        // Discard generic global Google Play Store descriptions
        if (description && (
          description.includes("Aproveite milhões") || 
          description.includes("Enjoy millions") || 
          description.includes("Android apps, games, music") ||
          description.length < 30
        )) {
          description = "";
        }

        if (!developer) {
          const devMatch = html.match(/href="\/store\/apps\/developer\?id=[^"]+"><span>([^<]+)<\/span>/i) || 
                           html.match(/<div class="Vbf7sn"><span>([^<]+)<\/span>/i) || 
                           html.match(/itemprop="author">[^<]*<span[^>]*>([^<]+)<\/span>/i) ||
                           html.match(/class="hrb33">([^<]+)<\/div>/i);
          if (devMatch) developer = devMatch[1].trim();
        }

        if (!category) {
          const genreMatch = html.match(/href="\/store\/apps\/category\/[^"]+"><span>([^<]+)<\/span>/i) || 
                             html.match(/itemprop="genre">([^<]+)<\/span>/i) ||
                             html.match(/href="\/store\/apps\/stream\/[^"]+"><span>([^<]+)<\/span>/i);
          if (genreMatch) category = genreMatch[1].trim();
        }

        // Extract extra metadata safely
        const updateMatch = html.match(/Atualizado em ([0-9]+ de [a-zA-Z]+ de [0-9]+)/i) || 
                            html.match(/Updated on ([a-zA-Z0-9\s,]+)/i) ||
                            html.match(/class="A9669">([^<]+)<\/div>/i);
        if (updateMatch) lastUpdated = updateMatch[1];

        const dlMatch = html.match(/([0-9]+[M|K|\+]+) de downloads/i) || 
                        html.match(/([0-9MKB\+]+)\+ downloads/i) ||
                        html.match(/class="JU1S6b">([^<]+)<\/div>/i);
        if (dlMatch) downloads = dlMatch[1];

        // Set reliable default placeholders if fields are still blank
        name = name || "Aplicativo Android";
        icon = icon || "https://play-lh.googleusercontent.com/c28668Y4uEPf1Xl8ALe6v3I0_b_E52N_yUuX-362yv78v94J3P3-F=w240-h240";
        category = category || "Ferramentas";
        developer = developer || "Desenvolvedor Android";
        description = description || "Descrição oficial indisponível no momento.";

        return res.json({
          success: true,
          source: "Google Play Scraper (Resilient Mode)",
          data: {
            name,
            icon,
            category,
            developer,
            description,
            lastUpdated,
            version,
            downloads
          }
        });
      } catch (e) {
        console.error("Play Store direct scrape failed, falling back to Gemini:", e);
      }
    }

    // Verify API Key existence before invoking Gemini
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined on server. Returning resilient local fallback data.");
      return res.json({
        success: true,
        source: "Local Smart Fallback Engine",
        data: getLocalFallbackData(query)
      });
    }

    // Fallback / App name search: Use Gemini 3.5 Flash with Google Search Grounding to find actual details!
    try {
      const prompt = `Consulte os metadados reais mais recentes para o aplicativo ou jogo Android: "${query}".
Se a consulta parecer um termo de busca geral (ex: "Minecraft", "Subway Surfers") ou um link sem ID, use a ferramenta de busca para localizar a página oficial do app no Google Play Store (play.google.com/store/apps/details) e retorne os dados corretos correspondentes ao schema especificado.`;

      const geminiResponse = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `Você é um recuperador de metadados reais da Google Play Store.
Sua missão é usar o Google Search para encontrar a página oficial do aplicativo no Google Play Store, extrair suas informações reais e atualizadas e retornar um objeto JSON estrito com os metadados corretos.
IMPORTANTE: Retorne APENAS o JSON no formato especificado. Não use blocos de código markdown como \`\`\`json.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nome correto do jogo ou aplicativo" },
              icon: { type: Type.STRING, description: "URL de alta qualidade do ícone real obtido na busca (ou URL padrão se indisponível)" },
              category: { type: Type.STRING, description: "Categoria ou gênero real (ex: Ação, RPG, Produtividade)" },
              developer: { type: Type.STRING, description: "Nome real da empresa ou desenvolvedor" },
              description: { type: Type.STRING, description: "Descrição oficial real resumida do jogo/app (pelo menos 3 parágrafos)" },
              lastUpdated: { type: Type.STRING, description: "Data recente de última atualização real (ex: 25 de Junho de 2026)" },
              version: { type: Type.STRING, description: "Versão recente real (ex: 1.52.0)" },
              downloads: { type: Type.STRING, description: "Quantidade real estimada de downloads (ex: 10M+, 500K+)" }
            },
            required: ["name", "icon", "category", "developer", "description", "lastUpdated", "version", "downloads"]
          }
        }
      });

      const text = geminiResponse.text?.trim() || "{}";
      const data = JSON.parse(text);
      
      return res.json({
        success: true,
        source: "Gemini Knowledge Engine with Search Grounding",
        data
      });

    } catch (err: any) {
      console.error("Gemini metadata retrieval failed, falling back to local fallback data:", err);
      return res.json({
        success: true,
        source: "Local Smart Fallback Engine (Recovery Mode)",
        data: getLocalFallbackData(query)
      });
    }
  });

  // API: Generate complete YouTube video assets with SEO analysis
  app.post("/api/gemini/generate", async (req, res) => {
    const { appData, userInstructions, templates, safeModeActive, safeReport } = req.body;

    if (!appData || !appData.name) {
      return res.status(400).json({ error: "Dados do aplicativo incompletos." });
    }

    // Verify API Key existence before invoking Gemini
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "Chave API do Gemini não configurada no servidor.", 
        details: "Por favor, configure sua chave API no painel de Secrets ou no botão 'Gemini Key' do cabeçalho." 
      });
    }

    try {
      const prompt = `Gere conteúdo de SEO de alta performance para um vídeo do YouTube sobre o seguinte aplicativo/jogo:
  Nome: ${appData.name}
  Categoria: ${appData.category}
  Desenvolvedor: ${appData.developer}
  Descrição: ${appData.description}
  Versão: ${appData.version}

  Instruções extras do Usuário: ${userInstructions || "Nenhuma instrução adicional."}

  Templates Personalizados a utilizar como guia (se houver):
  - Títulos: ${templates?.titles || "Padrão SOSDROID"}
  - Descrição: ${templates?.description || "Padrão SOSDROID"}
  - Tags: ${templates?.tags || "Padrão SOSDROID"}
  - Comentário: ${templates?.comment || "Padrão SOSDROID"}
  - Hashtags: ${templates?.hashtags || "Padrão SOSDROID"}

  Status do YouTube Safe Mode: ${safeModeActive ? "ATIVADO" : "DESATIVADO"}.
  ${safeReport && safeReport.length > 0 ? `Substituições realizadas pelo Safe Mode que devem ser mantidas:\n${JSON.stringify(safeReport)}` : ""}

  Requisitos de Geração:
  1. Títulos: Gere exatamente 15 títulos otimizados para cliques (CTR alta), usando linguagem natural e técnicas modernas de SEO. Máximo 65 caracteres cada. Sem clickbait apelativo.
  2. Descrição: Escreva uma descrição original com introdução cativante que detalha os recursos e novidades, e ao final inclua estritamente o bloco solicitado:
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
  ━━━━━━━━━━━━━━━━━━
  3. Tags: Gere entre 20 e 30 tags altamente relevantes, sem spam, separadas por vírgula.
  4. Hashtags: Gere exatamente 3 hashtags com hashtag no início.
  5. Comentário Fixado: Escreva um comentário fixado cativante incentivando o engajamento.
  6. Texto da Thumbnail: Escreva exatamente 5 sugestões curtas de texto de no máximo 3 palavras para estampar na thumbnail.
  7. SEO Análise: Calcule as métricas com base no conteúdo gerado.`;

      const systemInstruction = `Você é um especialista sênior em SEO para YouTube, focado no nicho de jogos e aplicativos Android.
  Sua missão é produzir conteúdos originais, envolventes e otimizados para atrair cliques e visualizações, mantening total integridade e segurança para a monetização do canal (sem palavras sensíveis como hack, mod, hackear, dinheiro infinito, premium desbloqueado).
  Sua linguagem deve ser profissional, técnica e humana (parecer escrito por especialista).
  Escreva os textos em PORTUGUÊS DO BRASIL.
  Retorne o resultado APENAS em JSON rigoroso seguindo o schema fornecido.`;

      const geminiResponse = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titles: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array com exatamente 15 títulos de até 65 caracteres."
              },
              description: {
                type: Type.STRING,
                description: "Descrição completa, detalhada, original, terminando com o bloco de assinatura SOSDROID."
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array de tags (20 a 30 itens relevantes)."
              },
              hashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array com exatamente 3 hashtags."
              },
              pinnedComment: {
                type: Type.STRING,
                description: "Sugestão de comentário fixado de alto engajamento."
              },
              thumbnailTexts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array com exatamente 5 sugestões de textos para thumbnail (máximo 3 palavras cada)."
              },
              seoAnalysis: {
                type: Type.OBJECT,
                properties: {
                  seoScore: { type: Type.INTEGER, description: "Nota geral de SEO (0 a 100)" },
                  estimatedCtr: { type: Type.STRING, description: "Taxa de cliques estimada (ex: Excelente (8.5% - 12%))" },
                  readability: { type: Type.STRING, description: "Nível de leitura (ex: Excelente)" },
                  keywordStuffing: { type: Type.STRING, description: "Densidade de palavras-chave (ex: Excelente / Baixo risco)" },
                  repetition: { type: Type.STRING, description: "Nível de repetição prejudicial (ex: Baixa)" },
                  youtubeRisk: { type: Type.STRING, description: "Classificação de risco para diretrizes do YouTube (Excelente, Bom, Médio, Alto, Crítico)" },
                  mainKeyword: { type: Type.STRING, description: "Palavra-chave principal identificada" },
                  secondaryKeywords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Lista de palavras-chave secundárias sugeridas"
                  }
                },
                required: ["seoScore", "estimatedCtr", "readability", "keywordStuffing", "repetition", "youtubeRisk", "mainKeyword", "secondaryKeywords"]
              }
            },
            required: ["titles", "description", "tags", "hashtags", "pinnedComment", "thumbnailTexts", "seoAnalysis"]
          }
        }
      });

      const result = JSON.parse(geminiResponse.text?.trim() || "{}");
      return res.json({ success: true, result });

    } catch (err: any) {
      console.error("Gemini generation failed:", err);
      return res.status(500).json({ error: "Erro na geração inteligente.", details: err.message });
    }
  });

  // Serve static app files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SOSDROID server running on port ${PORT}`);
  });
}

startServer();
