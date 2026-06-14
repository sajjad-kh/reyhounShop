const fetch = require('node-fetch'); // یا global fetch در Node 18+

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId, text, options = {}) {
  const body = {
    chat_id: chatId,
    text,
    ...options
  };

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return res.json();
}

function requestPhoneKeyboard() {
  return {
    reply_markup: {
      keyboard: [[{ text: '📱 ارسال شماره تماس', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };
}

function removeKeyboard() {
  return {
    reply_markup: { remove_keyboard: true }
  };
}

module.exports = { sendTelegramMessage, requestPhoneKeyboard, removeKeyboard };

