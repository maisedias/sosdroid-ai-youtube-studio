/**
 * SOSDROID AI YOUTUBE STUDIO - YOUTUBE SAFE MODE MODULE
 * Implements a robust dictionary-based regex scanning engine that blocks monetization-harmful keywords
 * and replaces them with premium, safe alternatives suited for YouTube standards.
 */

// Mapping of forbidden phrases/keywords to safe alternatives
export const SAFE_REPLACEMENTS = [
  {
    original: /\bmod apk\b/gi,
    replacement: "apk oficial atualizado",
    reason: "Remoção de menção a 'mod' para evitar banimento por pirataria.",
    label: "mod apk"
  },
  {
    original: /\bapk mod\b/gi,
    replacement: "aplicativo oficial",
    reason: "Evita sanções de diretrizes de comunidade do YouTube sobre softwares modificados.",
    label: "apk mod"
  },
  {
    original: /\bhack\b/gi,
    replacement: "método / dicas",
    reason: "Palavra de alto risco de desmonetização e restrição de idade.",
    label: "hack"
  },
  {
    original: /\bhackear\b/gi,
    replacement: "aprender segredos",
    reason: "Políticas do YouTube proíbem instruções de invasão e modificação.",
    label: "hackear"
  },
  {
    original: /\bunlimited money\b/gi,
    replacement: "recursos completos",
    reason: "Meta descrições com fraudes financeiras de jogos são desmonetizadas.",
    label: "unlimited money"
  },
  {
    original: /\bdinheiro infinito\b/gi,
    replacement: "recursos ilimitados (estratégia)",
    reason: "Promover cheats de moedas virtuais infringe as diretrizes do YouTube.",
    label: "dinheiro infinito"
  },
  {
    original: /\bpremium desbloqueado\b/gi,
    replacement: "acesso premium completo",
    reason: "Bypasses de assinaturas pagas causam remoção direta de vídeos.",
    label: "premium desbloqueado"
  },
  {
    original: /\bcrack\b/gi,
    replacement: "ativador legal",
    reason: "Software crackeado é violação gravíssima de direitos autorais.",
    label: "crack"
  },
  {
    original: /\blicense bypass\b/gi,
    replacement: "ativação oficial",
    reason: "Evita termos que sugerem contorno de segurança de licenças.",
    label: "license bypass"
  },
  {
    original: /\bcheat\b/gi,
    replacement: "macetes secretos",
    reason: "Uso moderado de termos de trapaça melhora a indexação segura.",
    label: "cheat"
  },
  {
    original: /\bcheats\b/gi,
    replacement: "dicas adicionais",
    reason: "A IA busca termos amigáveis para anunciantes (advertiser-friendly).",
    label: "cheats"
  },
  {
    original: /\bpirata\b/gi,
    replacement: "oficial original",
    reason: "Evita acusações automáticas de distribuição ilegal de software.",
    label: "pirata"
  },
  {
    original: /\bremove ads\b/gi,
    replacement: "sem anúncios (experiência limpa)",
    reason: "Evita incentivo a bloqueadores de anúncios oficiais das plataformas.",
    label: "remove ads"
  },
  {
    original: /\bfull unlocked\b/gi,
    replacement: "completamente desbloqueado",
    reason: "Frase em inglês frequentemente associada a pirataria de software.",
    label: "full unlocked"
  },
  {
    original: /\blucky patcher\b/gi,
    replacement: "gerenciador de arquivos",
    reason: "Nome de software de cheat explicitamente banido do YouTube.",
    label: "lucky patcher"
  },
  {
    original: /\bmodificado\b/gi,
    replacement: "aprimorado / atualizado",
    reason: "Jogos modificados perdem a monetização pelo Content ID.",
    label: "modificado"
  },
  {
    original: /\bbypass\b/gi,
    replacement: "otimização legal",
    reason: "Evita termos que remetem a driblar segurança de softwares.",
    label: "bypass"
  }
];

/**
 * Scans a given text block, replaces all unsafe monetization-harmful terms
 * with premium alternatives, and returns the cleaned text along with a detailed report.
 * @param {string} text - Input text from user or generated assets.
 * @returns {{cleanText: string, replacedTerms: Array<{original: string, replaced: string, reason: string}>}}
 */
export function sanitizeYouTubeContent(text) {
  if (!text) return { cleanText: "", replacedTerms: [] };
  
  let cleanText = text;
  const replacedTerms = [];

  for (const item of SAFE_REPLACEMENTS) {
    // Reset regex index and check if word exists
    item.original.lastIndex = 0;
    if (item.original.test(cleanText)) {
      // Find exact matches for reporting before replacement
      const matches = cleanText.match(item.original);
      const occurrences = matches ? matches.length : 1;
      
      // Perform replacement
      cleanText = cleanText.replace(item.original, item.replacement);
      
      replacedTerms.push({
        original: item.label,
        replaced: item.replacement,
        reason: item.reason,
        count: occurrences
      });
    }
  }

  return {
    cleanText,
    replacedTerms
  };
}
