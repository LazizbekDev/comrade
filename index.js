import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

let lastChatId = null;

// 🧠 Promptlar
const PERSONALITY_PROMPT_TEMPLATE = (message) => `
Respond in a dark and sarcastic tone.
You are in a male students' Telegram group chat.
Use brutal humor, dry sarcasm, and never take anything seriously.
Only speak in Uzbek.
Message: ${message}
`;

const RANDOM_MESSAGE_PROMPT = `
Send a random dark and sarcastic message.
You are in a male students' Telegram group chat.
Use brutal humor, dry sarcasm, and never take anything seriously.
Only speak in Uzbek.
`;

// 🤖 Gemini API so‘rovi
async function getAIResponse(userMessage = null) {
  const prompt = userMessage
    ? PERSONALITY_PROMPT_TEMPLATE(userMessage)
    : RANDOM_MESSAGE_PROMPT;

  try {
    const res = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        params: { key: process.env.GEMINI_API_KEY },
      }
    );

    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || '😶';
  } catch (err) {
    console.error('❌ Gemini API error:', err.message);
    return '😶';
  }
}

// 🔁 Random xabar yuborish (5–10 soat oralig‘ida)
function startRandomMessageSender() {
  const scheduleNext = async () => {
    const timeout = Math.floor(Math.random() * (10 - 5 + 1) + 5) * 60 * 60 * 1000;
    setTimeout(async () => {
      if (lastChatId) {
        const msg = await getAIResponse();
        bot.sendMessage(lastChatId, msg);
      }
      scheduleNext(); // qayta chaqirish
    }, timeout);
  };

  scheduleNext();
}

// 💬 Xabarlarni qabul qilish
bot.on('message', async (msg) => {
  const text = msg.text || '';
  lastChatId = msg.chat.id;

  try {
    const botInfo = await bot.getMe();
    const botUsername = `@${botInfo.username}`;

    const mentioned = text.toLowerCase().includes(botUsername.toLowerCase());
    const replyingToBot = msg.reply_to_message?.from?.username === botInfo.username;
    const hasQuestionMark = text.includes('?');

    if (hasQuestionMark || replyingToBot || mentioned) {
      let promptMessage = text;

      if (mentioned) {
        const cleaned = text.replace(botUsername, '').trim();
        promptMessage = `This person (@${botInfo.username}) mentioned you. Send brutal humor and dry sarcasm:\n${cleaned}`;
      }

      const reply = await getAIResponse(promptMessage);
      bot.sendMessage(msg.chat.id, reply, { reply_to_message_id: msg.message_id });
    }
  } catch (err) {
    console.error('❌ Error handling message:', err.message);
  }
});

// 🚀 Boshlash
startRandomMessageSender();
console.log('🤖 Bot ishga tushdi...');