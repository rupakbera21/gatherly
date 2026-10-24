/**
 * @module services/announce
 * @purpose Dispatches accessible polite announcements to the single app-level live region (#announcer).
 */

export function announce(message: string): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("announcer");
  if (!el) return;

  // Clear first so identical consecutive messages re-trigger screen readers
  el.textContent = "";
  setTimeout(() => {
    el.textContent = message;
  }, 50);
}
