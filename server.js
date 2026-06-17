import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

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
    console.error(err);
    return res.status(500).json({ error: err.toString() });
  }
});

app.use('/uploads', express.static(UPLOAD_DIR));

app.listen(PORT, () => console.log(`Upload server running on http://localhost:${PORT}`));
