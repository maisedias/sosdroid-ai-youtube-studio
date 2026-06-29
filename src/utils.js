/**
 * SOSDROID AI YOUTUBE STUDIO - UTILS MODULE
 * General purpose utilities for copy-paste, date formatting, dynamic toasts, and file downloads.
 */

/**
 * Copies plain text to the clipboard and provides visual feedback.
 * @param {string} text - The text content to copy.
 * @returns {Promise<boolean>} Resolves to true if successful.
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or iframe constraints
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed"; // Avoid scrolling to bottom
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    }
  } catch (err) {
    console.error("Erro ao copiar para a área de transferência:", err);
    return false;
  }
}

/**
 * Displays a non-blocking floating notification toast in the app.
 * @param {string} message - Message text.
 * @param {'success' | 'warning' | 'danger' | 'info'} type - Type of toast.
 */
export function showToast(message, type = "success") {
  // Check if active container exists or create one
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.right = "20px";
    container.style.zIndex = "9999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;
  toast.style.background = "rgba(18, 24, 38, 0.9)";
  toast.style.backdropFilter = "blur(12px)";
  toast.style.padding = "10px 18px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.5)";
  toast.style.color = "#ffffff";
  toast.style.fontSize = "0.875rem";
  toast.style.fontWeight = "500";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "8px";
  toast.style.minWidth = "250px";
  toast.style.maxWidth = "400px";
  toast.style.borderLeft = "4px solid var(--primary)";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(20px)";
  toast.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";

  // Color mapping
  if (type === "success") toast.style.borderLeftColor = "var(--success)";
  if (type === "warning") toast.style.borderLeftColor = "var(--warning)";
  if (type === "danger") toast.style.borderLeftColor = "var(--danger)";
  if (type === "info") toast.style.borderLeftColor = "var(--info)";

  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger enter animation
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 10);

  // Trigger exit and removal
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

/**
 * Formats a Date object or timestamp into Brazilian Portuguese.
 * @param {Date | string | number} date - The date to format.
 * @returns {string} Formatted date string (ex: "28/06/2026 19:54").
 */
export function formatDate(date) {
  if (!date) return "Não disponível";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Data inválida";
  
  const pad = (n) => String(n).padStart(2, '0');
  
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

/**
 * Initiates browser file download for text content.
 * @param {string} content - File content.
 * @param {string} filename - Output file name.
 */
export function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Initiates browser file download for structured JSON content.
 * @param {object | Array} obj - JSON object.
 * @param {string} filename - Output file name.
 */
export function downloadJsonFile(obj, filename) {
  const content = JSON.stringify(obj, null, 2);
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapes HTML string to prevent script injections.
 * @param {string} str - String to escape.
 * @returns {string} Escaped string.
 */
export function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
