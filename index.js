// dailyBot/index.js
import fetch from 'node-fetch';
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import OpenAI from 'openai';
import Parser from 'rss-parser';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });

async function fetchTechNews() {
  const feeds = [
    'https://techcrunch.com/feed/',
    'https://www.theverge.com/rss/index.xml',
    'https://hnrss.org/frontpage'
  ];
  const allNews = [];

  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url);
      allNews.push(...feed.items.slice(0, 1));
    } catch (err) {
      console.error(`Failed to fetch ${url}:`, err);
    }
  }

  return allNews.slice(0, 3).map(item => `${item.title} - ${item.link}`);
}

async function fetchInsightOfTheDay() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: "Share one interesting fact or insight about programming, software development, or computer science."
        }
      ]
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("Insight fetch failed:", err);
    return "Stay curious and keep building.";
  }
}

async function getFocusSuggestion() {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content: "Give me one specific and actionable focus suggestion for a software developer today."
      }
    ]
  });

  return response.choices[0].message.content.trim();
}

async function getDevTrivia() {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: "Give a fun, short programming trivia or fact." }]
      });
      return res.choices[0].message.content.trim();
    } catch (err) {
      console.error("Trivia fetch failed:", err);
      return "The first computer bug was an actual moth.";
    }
  }
  
  async function getArchitecturePattern() {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: "Name one common software architecture pattern and describe it briefly." }]
      });
      return res.choices[0].message.content.trim();
    } catch (err) {
      console.error("Architecture fetch failed:", err);
      return "MVC (Model-View-Controller) separates concerns in web apps.";
    }
  }
  
  async function getHiddenTool() {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: "Recommend one lesser-known but useful developer tool or CLI utility." }]
      });
      return res.choices[0].message.content.trim();
    } catch (err) {
      console.error("Tool fetch failed:", err);
      return "Try `jq` – a powerful CLI JSON processor.";
    }
  }
  

  async function sendDailyMessage() {
    try {
      const [news, insight, focus, trivia, pattern, tool] = await Promise.all([
        fetchTechNews(),
        fetchInsightOfTheDay(),
        getFocusSuggestion(),
        getDevTrivia(),
        getArchitecturePattern(),
        getHiddenTool()
      ]);
  
      const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  
      const message = `
  📅 *${date}* – Daily Dev Briefing
  
  📰 *Tech Headlines:*
  - ${news.join('\n- ')}
  
  🧠 *Insight of the Day:*\n_${insight}_
  
  🎯 *Focus Suggestion:*\n${focus}
  
  🧩 *Fun Dev Trivia:*\n${trivia}
  
  🏛️ *Architecture Pattern:*\n${pattern}
  
  🔧 *Tool You Should Know:*\n${tool}
      `;
  
      await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
      console.log("✅ Message sent");
    } catch (err) {
      console.error("❌ Failed to send daily message:", err);
    }
  }
  

// Manual trigger via /now command
bot.onText(/\/now/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() === TELEGRAM_CHAT_ID) {
    await sendDailyMessage();
  } else {
    bot.sendMessage(chatId, "⛔ Unauthorized user.");
  }
});

// Schedule daily at 8:00 AM server time
cron.schedule('0 8 * * *', () => {
  console.log("⏰ Running scheduled task...");
  sendDailyMessage();
});
