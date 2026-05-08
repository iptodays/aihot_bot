require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const AIHotAPI = require('./aihot-api');

class AIHotBot {
  constructor() {
    this.botToken = process.env.BOT_TOKEN;
    this.chatId = process.env.CHAT_ID;
    this.scheduledTime = process.env.SCHEDULED_TIME || '09:00';
    this.aihotUrl = process.env.AIHOT_URL || 'https://aihot.virxact.com';
    this.pushMode = process.env.PUSH_MODE || 'daily'; // daily 或 items

    this.bot = new TelegramBot(this.botToken, { polling: false });
    this.api = new AIHotAPI(this.aihotUrl);
  }

  async sendMessage(message) {
    try {
      await this.bot.sendMessage(this.chatId, message, {
        disable_web_page_preview: true
      });
      console.log('消息发送成功');
      return true;
    } catch (error) {
      console.error('消息发送失败:', error.message);
      return false;
    }
  }

  async pushDailyNews() {
    console.log('开始获取每日 AI 热点...');

    if (this.pushMode === 'daily') {
      // 使用日报 API
      const dailyData = await this.api.getDailyNews();
      if (dailyData) {
        const message = this.api.formatDailyMessage(dailyData);
        await this.sendMessage(message);
      } else {
        console.warn('未获取到日报数据');
      }
    } else {
      // 使用精选条目 API
      const items = await this.api.getItems(15, 'featured');
      if (items.length > 0) {
        const message = this.api.formatItemsMessage(items, '今日 AI 精选');
        await this.sendMessage(message);
      } else {
        console.warn('未获取到任何文章');
      }
    }
  }

  runScheduler() {
    console.log(`定时任务已启动，每天 ${this.scheduledTime} 推送 AI 热点`);
    
    const [hour, minute] = this.scheduledTime.split(':').map(Number);
    
    schedule.scheduleJob({ hour, minute }, async () => {
      await this.pushDailyNews();
    });
  }

  async testPush() {
    console.log('执行测试推送...');
    await this.pushDailyNews();
  }
}

async function main() {
  const bot = new AIHotBot();
  
  if (process.argv[2] === 'test') {
    // 测试模式：立即推送一次
    console.log('运行在测试模式');
    await bot.testPush();
    process.exit(0);
  } else {
    // 正常模式：运行定时任务
    bot.runScheduler();
  }
}

main().catch(console.error);
