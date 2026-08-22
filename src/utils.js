export function daysSince(dateStr) {
  if (!dateStr) return null;
  const applied = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(applied.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today - applied;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatDaysSince(dateStr) {
  const days = daysSince(dateStr);
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

// Wishlist cards haven't been applied to yet, so "days since applied" reads oddly
// there -- use the verb that matches what actually happened at that stage.
export function formatStatusDate(dateStr, status) {
  const days = daysSince(dateStr);
  if (days === null) return '—';
  const verb = status === 'wishlist' ? 'Saved' : 'Applied';
  if (days === 0) return `${verb} today`;
  if (days === 1) return `${verb} 1 day ago`;
  return `${verb} ${days} days ago`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Blob <-> base64 (so an attached resume file can travel inside a plain-JSON export) ----------

export async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToBlob(base64, type) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: type || 'application/octet-stream' });
}

// Opens an attached resume file (a Blob/File pulled out of IndexedDB) in a new tab.
export function openBlobInNewTab(blob) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  // give the new tab time to actually load the blob before revoking it
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
