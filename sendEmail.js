import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env then .env.local if present so credentials are available
dotenv.config();
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    // transporter will still be created but verify will fail with clear message
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

const transporter = createTransporter();

// Verify transporter at startup to surface auth/configuration errors early
transporter.verify().catch(() => {});

export default async function sendMail(mailOptions) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER or EMAIL_PASS not set in environment');
  }

  // Ensure from is set if not provided
  if (!mailOptions.from) mailOptions.from = process.env.EMAIL_USER;

  const info = await transporter.sendMail(mailOptions);
  return info;
}
