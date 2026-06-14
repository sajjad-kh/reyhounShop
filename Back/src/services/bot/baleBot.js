require('dotenv').config();
const axios = require('axios');
const express = require('express');

const app = express();
app.use(express.json());

console.log("🔥 VERSION TEST 999");

const PORT = process.env.BALE_BOT_PORT || 4000;

console.log('🤖 BALE BOT (WEBHOOK) STARTED');


app.use((req, res, next) => {
  console.log("🔥 HIT:", req.method, req.url);
  next();
});

// ========================
// WEBHOOK
// ========================
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;

    console.log('📩 RAW UPDATE:', JSON.stringify(update, null, 2)); // اضافه کنید

    const msg = update.message || update;
    const text = msg?.text;
    const chatId = msg?.chat?.id || msg?.from?.id;

    if (!text || !text.startsWith('/start')) {
      return res.sendStatus(200);
    }

    const loginId = text.split(' ')[1];

    if (!loginId) {
      return res.sendStatus(200);
    }

    console.log('🔑 LOGIN ID:', loginId);
    console.log('👤 CHAT ID:', chatId);

    // به backend اطلاع بده که این loginId تأیید شد
    await axios.post(`${process.env.BACKEND_URL}/api/v1/auth/bale/callback`, {
      loginId,
      chatId,
      username: msg?.from?.username,
      firstName: msg?.from?.first_name,
    });

// بعد از SESSION APPROVED:
    await axios.post(
        `https://tapi.bale.ai/bot${process.env.BALE_BOT_TOKEN}/sendMessage`,
        {
            chat_id: chatId,
            text: '✅ ورود موفق!\n\nروی دکمه زیر کلیک کنید تا به اپ برگردید:',
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '🔵 بازگشت به اپ',
                        url: `${process.env.FRONTEND_URL}/bale-callback?loginId=${loginId}`
                    }
                ]]
            }
        }
    );

    return res.sendStatus(200);
  } catch (err) {
    console.error(err);
    return res.sendStatus(200);
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// ========================
app.listen(PORT, () => {
  console.log(`🚀 Webhook running on port ${PORT}`);
});

