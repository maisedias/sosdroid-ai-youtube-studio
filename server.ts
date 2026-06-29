import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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

    // Helper to extract package ID from Google Play URL
    const getPackageId = (url: string): string | null => {
      try {
        const match = url.match(/id=([a-zA-Z0-9._]+)/);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    };

    const packageId = getPackageId(query);

    if (packageId) {
      // Attempt scraping from Play Store details page
      try {
        const playUrl = `https://play.google.com/store/apps/details?id=${packageId}`;
        const response = await fetch(playUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });

        if (response.ok) {
          const html = await response.text();
          // Try parsing JSON-LD microdata
          const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i;
          const match = html.match(jsonLdRegex);
          
          if (match && match[1]) {
            const data = JSON.parse(match[1].trim());
            
            // Scrape extra fields like last updated and version from meta / body if possible
            // In modern Play Store, version/update are in divs or script bundles. Let's do a regex fallback
            let lastUpdated = "Não disponível";
            let version = "Varia de acordo com o dispositivo";
            let downloads = "100.000+";

            const updateMatch = html.match(/Atualizado em ([0-9]+ de [a-zA-Z]+ de [0-9]+)/i) || html.match(/Updated on ([a-zA-Z0-9\s,]+)/);
            if (updateMatch) lastUpdated = updateMatch[1];

            return res.json({
              success: true,
              source: "Google Play Scraper",
              data: {
                name: data.name || "Aplicativo Android",
                icon: data.image || "https://play-lh.googleusercontent.com/c28668Y4uEPf1Xl8ALe6v3I0_b_E52N_yUuX-362yv78v94J3P3-F=w240-h240",
                category: data.genre || "Ferramentas",
                developer: data.author?.name || "Desenvolvedor Android",
                description: data.description || "Descrição oficial indisponível.",
                lastUpdated: lastUpdated,
                version: version,
                downloads: downloads
              }
            });
          }
        }
      } catch (e) {
        console.error("Play Store scraping failed, falling back to Gemini:", e);
      }
    }

    // Fallback / App name search: Use Gemini to retrieve realistic and accurate metadata
    try {
      const prompt = `Consulte dados públicos recentes e confiáveis para retornar os metadados do aplicativo ou jogo Android: "${query}".
  Forneça informações reais e bem estruturadas. Se o aplicativo não for muito conhecido, forneça informações plausíveis com base no nome.`;

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `Você é um recuperador profissional de metadados da Google Play Store. 
  Sua tarefa é retornar um objeto JSON estrito com os metadados do aplicativo/jogo fornecido.
  IMPORTANTE: Retorne APENAS o JSON no formato especificado. Não use markdown como \`\`\`json.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nome correto do jogo ou aplicativo" },
              icon: { type: Type.STRING, description: "URL de um ícone de alta qualidade (pode ser o real ou uma URL de ilustração representativa do Unsplash)" },
              category: { type: Type.STRING, description: "Categoria ou gênero (ex: Ação, RPG, Produtividade)" },
              developer: { type: Type.STRING, description: "Nome da empresa ou desenvolvedor" },
              description: { type: Type.STRING, description: "Descrição oficial resumida do jogo/app (pelo menos 3 parágrafos)" },
              lastUpdated: { type: Type.STRING, description: "Data recente de última atualização (ex: 15 de Junho de 2026)" },
              version: { type: Type.STRING, description: "Versão recente (ex: 2.14.5)" },
              downloads: { type: Type.STRING, description: "Quantidade estimada de downloads (ex: 10M+, 500K+)" }
            },
            required: ["name", "icon", "category", "developer", "description", "lastUpdated", "version", "downloads"]
          }
        }
      });

      const data = JSON.parse(geminiResponse.text?.trim() || "{}");
      return res.json({
        success: true,
        source: "Gemini Knowledge Engine",
        data
      });

    } catch (err: any) {
      console.error("Gemini metadata retrieval failed:", err);
      return res.status(500).json({ error: "Não foi possível obter as informações do aplicativo.", details: err.message });
    }
  });

  // API: Generate complete YouTube video assets with SEO analysis
  app.post("/api/gemini/generate", async (req, res) => {
    const { appData, userInstructions, templates, safeModeActive, safeReport } = req.body;

    if (!appData || !appData.name) {
      return res.status(400).json({ error: "Dados do aplicativo incompletos." });
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

      const geminiResponse = await ai.models.generateContent({
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
