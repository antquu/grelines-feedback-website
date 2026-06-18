import emailjs from '@emailjs/browser';

export async function sendEmailAPI(payload) {
  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    throw new Error('EmailJS not configured (VITE_EMAILJS_* env vars missing)');
  }

  const templateParams = {
    to_email: payload.to_email || '',
    subject: payload.subject || '',
    title: payload.title || '',
    zone: payload.zone || '',
    type: payload.type || '',
    description: payload.description || '',
    contact_email: payload.contact_email || '',
    attachment_name: payload.attachment_name || '',
    attachment_url: payload.attachment_url || '',
    created_at: payload.created_at || '',
    from_name: payload.from_name || '',
    from_email: payload.from_email || ''
  };

  const res = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
  if (!res || res.status !== 200) {
    throw new Error('Failed to send email via EmailJS');
  }
  return res;
}
