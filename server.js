import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import sendMail from './sendEmail.js';

dotenv.config();
// If a .env.local exists (used in this project), load it to override
if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
}

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

app.use(cors());
app.use(express.json({ limit: '75mb' }));

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.post('/upload', async (req, res) => {
  try {
    const { filename, mimeType, contentBase64 } = req.body;
    if (!filename || !contentBase64) return res.status(400).json({ error: 'Missing fields' });

    const buffer = Buffer.from(contentBase64, 'base64');
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, safeName);

    await fs.promises.writeFile(filePath, buffer);

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${safeName}`;
    return res.json({ fileUrl });
  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    
    // Expect feedback fields in the body
    const {
      to_email,
      title,
      zone,
      type,
      description,
      attachment_name,
      attachment_filename,
      attachment_url,
      created_at,
      from_name,
      from_email,
      contact_email
    } = req.body;

    // Build recipient list by combining `to_email` (form) and `EMAIL_RECIPIENT` (env).
    // This allows sending to the form recipient and also to configured recipients in .env
    const envRecipients = process.env.EMAIL_RECIPIENT ? String(process.env.EMAIL_RECIPIENT).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : [];
    const formRecipients = to_email ? String(to_email).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : [];

    // Merge and deduplicate (do NOT automatically include the sending account in recipients)
    const merged = Array.from(new Set([...(formRecipients || []), ...(envRecipients || [])]));
    if (merged.length === 0) {
      return res.status(500).json({ error: 'Recipient email not configured. Set EMAIL_RECIPIENT in .env or provide to_email in form.' });
    }
    const recipientEmail = merged.join(', ');

    // Determine app name from provided subject (fallback to GreLines)
    const providedSubject = (req.body && req.body.subject) ? String(req.body.subject) : '';
    const appName = /grego/i.test(providedSubject) ? 'GreGo' : 'GreLines';
    const subject = `New feedback for ${appName}`;

    // If client provided an attachment_url pointing to our /uploads, extract filename
    let finalAttachmentFilename = attachment_filename;
    if (!finalAttachmentFilename && attachment_url) {
      try {
        const url = new URL(attachment_url);
        const pathname = url.pathname || '';
        if (pathname.startsWith('/uploads/')) {
          finalAttachmentFilename = pathname.split('/').pop();
        }
      } catch (e) {
        // not an absolute URL, maybe relative
        if (attachment_url.startsWith('/uploads/')) {
          finalAttachmentFilename = attachment_url.split('/').pop();
        }
      }
    }

    // Prefer a configured public base URL so links in emails point to an accessible host
    const baseUrl = process.env.SERVER_BASE_URL && String(process.env.SERVER_BASE_URL).trim() !== ''
      ? String(process.env.SERVER_BASE_URL).replace(/\/$/, '')
      : `${req.protocol}://${req.get('host')}`;
    const fileLink = finalAttachmentFilename ? `${baseUrl}/uploads/${finalAttachmentFilename}` : (attachment_url || '');

    // Build optional contact block only when a contact value exists
    const contactValue = from_name ? `${from_name} &lt;${from_email || ''}&gt;` : (from_email || contact_email || '');
    const contactHtml = contactValue && contactValue !== '' ? `\n          <dt>Contact (formulaire)</dt>\n          <dd>${contactValue}</dd>\n` : '';

    

    const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${appName} Feedback</title>
    <style>
      body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111827; background:#f3f4f6; padding:20px; }
      .container { max-width:680px; margin:0 auto; }
      .card { background:#ffffff; border-radius:8px; padding:18px; border:1px solid #e6e7eb; }
      h1 { font-size:18px; margin:0 0 12px 0; color:#0f172a; }
      .meta { font-size:13px; color:#374151; margin-bottom:12px; }
      dl { display:block; margin:0; }
      dt { font-weight:600; color:#0f172a; margin-top:10px; font-size:13px; }
      dd { margin:4px 0 0 0; color:#374151; font-size:14px; }
      .desc { background:#f8fafc; padding:10px; border-radius:6px; margin-top:8px; color:#0f172a; font-family:monospace; font-size:13px; }
      .footer { margin-top:16px; font-size:12px; color:#6b7280; }
      a { color:#0369a1; word-break:break-all; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <h1>Nouvelle évaluation — ${appName}</h1>

        <dl>
          <dt>Titre</dt>
          <dd>${title || '-'}</dd>

          <dt>Zone</dt>
          <dd>${zone || '-'}</dd>

          <dt>Type</dt>
          <dd>${type || '-'}</dd>

          <dt>Description</dt>
          <dd><div class="desc">${(description || '-').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></dd>

          <dt>Pièce jointe</dt>
          <dd>${attachment_name || 'Aucune'}</dd>
          <dd>${fileLink ? `<a href="${fileLink}" target="_blank" rel="noopener noreferrer">Télécharger la pièce jointe</a><br/><small>${fileLink}</small>` : ''}</dd>

${contactHtml}

          <dt>Horodatage</dt>
          <dd>${created_at || new Date().toLocaleString()}</dd>
        </dl>

        <div class="footer">Ce message a été envoyé automatiquement depuis le formulaire de <a href="https://grelines-feedback-website.vercel.app/" target="_blank" rel="noopener noreferrer">feedback GreStudio.</a></div>
        <div class="footer">Merci de ne pas y répondre.</div>
      </div>
    </div>
  </body>
  </html>`;

    let mailOptions = {
      // Sender shown with app-specific display name and the configured Gmail account
      from: `"${appName} Feedback Service" <${process.env.EMAIL_USER}>`,
      // Send to the requested recipient (to_email) or fallback to configured server email
      to: recipientEmail,
      subject,
      html
    };

    // Plain-text fallback including link to attachment (if available)
    let text = description || `Nouvelle évaluation ${appName}`;
    if (fileLink) text += `\n\nPièce jointe: ${fileLink}`;
    mailOptions.text = text;

    

    // Attach uploaded file from uploads folder if provided
    if (finalAttachmentFilename) {
      const attachPath = path.join(UPLOAD_DIR, finalAttachmentFilename);
      if (fs.existsSync(attachPath)) {
        mailOptions.attachments = [
          {
            filename: attachment_name || finalAttachmentFilename,
            path: attachPath
          }
        ];
      }
    }

    try {
      const info = await sendMail(mailOptions);
      return res.json({ ok: true });
    } catch (sendErr) {
      return res.status(500).json({ error: sendErr && sendErr.message ? sendErr.message : String(sendErr) });
    }
  } catch (err) {
    
    return res.status(500).json({ error: err.toString() });
  }
});

app.use('/uploads', express.static(UPLOAD_DIR));

app.listen(PORT, () => {});
