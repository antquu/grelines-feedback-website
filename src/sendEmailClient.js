export async function sendEmailAPI(payload) {
  // payload should include fields like:
  // { to_email, title, zone, type, description, attachment_name, attachment_filename, created_at, from_name, from_email }
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const url = `${API_BASE}/api/send-email`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send email');
  }

  return res.json();
}
