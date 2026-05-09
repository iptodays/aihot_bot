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
    this.pollingMode = process.argv.includes('polling'); // 是否启用交互模式

    // 根据模式决定是否启用 polling
    this.bot = new TelegramBot(this.botToken, { 
      polling: this.pollingMode 
    });
    this.api = new AIHotAPI(this.aihotUrl);
    
    // 用户会话存储
    this.userSessions = new Map();

    if (this.pollingMode) {
      this.setupCommandHandlers();
    }
  }

  // 获取用户会话
  getSession(chatId) {
    if (!this.userSessions.has(chatId)) {
      this.userSessions.set(chatId, {
        currentCategory: null,
        currentMode: 'featured',
        items: [],
        page: 0,
        pageSize: 5
      });
    }
    return this.userSessions.get(chatId);
  }

  setupCommandHandlers() {
    console.log('🤖 Bot 交互模式已启用！');
    
    // 开始命令
    this.bot.onText(/\/start/, (msg) => {
      this.sendMainMenu(msg.chat.id);
    });

    // 帮助命令
    this.bot.onText(/\/help/, (msg) => {
      this.sendHelpMessage(msg.chat.id);
    });

    // 获取日报
    this.bot.onText(/\/daily/, async (msg) => {
      await this.handleDailyCommand(msg.chat.id);
    });

    // 菜单命令
    this.bot.onText(/\/menu/, (msg) => {
      this.sendMainMenu(msg.chat.id);
    });

    // 回调查询（按钮点击）
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    // 错误处理
    this.bot.on('polling_error', (error) => {
      console.error('Polling error:', error.message);
    });
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const action = callbackQuery.data;
    const session = this.getSession(chatId);

    try {
      // 回答回调查询，避免加载状态
      await this.bot.answerCallbackQuery(callbackQuery.id);

      switch (action) {
        case 'menu_main':
          await this.editMainMenu(chatId, messageId);
          break;
        case 'menu_daily':
          await this.handleDailyCommand(chatId, messageId);
          break;
        case 'menu_featured':
          await this.showCategoryMenu(chatId, messageId, 'featured');
          break;
        case 'menu_all':
          await this.showCategoryMenu(chatId, messageId, 'all');
          break;
        case 'category_all':
          await this.loadAndShowItems(chatId, messageId, session.currentMode, null);
          break;
        case 'category_models':
          await this.loadAndShowItems(chatId, messageId, session.currentMode, 'ai-models');
          break;
        case 'category_products':
          await this.loadAndShowItems(chatId, messageId, session.currentMode, 'products');
          break;
        case 'category_industry':
          await this.loadAndShowItems(chatId, messageId, session.currentMode, 'industry');
          break;
        case 'category_papers':
          await this.loadAndShowItems(chatId, messageId, session.currentMode, 'papers');
          break;
        case 'category_tips':
          await this.loadAndShowItems(chatId, messageId, session.currentMode, 'tips');
          break;
        case 'page_prev':
          if (session.page > 0) {
            session.page--;
            await this.showItemsPage(chatId, messageId, session);
          }
          break;
        case 'page_next':
          const maxPage = Math.ceil(session.items.length / session.pageSize) - 1;
          if (session.page < maxPage) {
            session.page++;
            await this.showItemsPage(chatId, messageId, session);
          }
          break;
        case 'page_first':
          session.page = 0;
          await this.showItemsPage(chatId, messageId, session);
          break;
        case 'page_last':
          session.page = Math.ceil(session.items.length / session.pageSize) - 1;
          await this.showItemsPage(chatId, messageId, session);
          break;
      }
    } catch (error) {
      console.error('Callback error:', error);
      await this.bot.sendMessage(chatId, '❌ 操作失败，请稍后重试');
    }
  }

  async sendMainMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📰 最新日报', callback_data: 'menu_daily' }],
        [{ text: '✨ 精选热点', callback_data: 'menu_featured' }],
        [{ text: '📚 全部资讯', callback_data: 'menu_all' }],
        [{ text: '❓ 帮助', callback_data: 'menu_help' }]
      ]
    };

    const message = `👋 欢迎使用 AIHOT Bot！

我是一个每日推送 AI 热点资讯的机器人。

请选择你想查看的内容：`;

    await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
  }

  async editMainMenu(chatId, messageId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📰 最新日报', callback_data: 'menu_daily' }],
        [{ text: '✨ 精选热点', callback_data: 'menu_featured' }],
        [{ text: '📚 全部资讯', callback_data: 'menu_all' }],
        [{ text: '❓ 帮助', callback_data: 'menu_help' }]
      ]
    };

    const message = `👋 欢迎使用 AIHOT Bot！

请选择你想查看的内容：`;

    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
  }

  async showCategoryMenu(chatId, messageId, mode) {
    const session = this.getSession(chatId);
    session.currentMode = mode;

    const modeText = mode === 'featured' ? '精选' : '全部';
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '🌐 全部分类', callback_data: 'category_all' }],
        [{ text: '🤖 模型发布', callback_data: 'category_models' }],
        [{ text: '🚀 产品更新', callback_data: 'category_products' }],
        [{ text: '📰 行业动态', callback_data: 'category_industry' }],
        [{ text: '📄 论文研究', callback_data: 'category_papers' }],
        [{ text: '💡 技巧观点', callback_data: 'category_tips' }],
        [{ text: '🔙 返回主菜单', callback_data: 'menu_main' }]
      ]
    };

    const message = `📂 请选择${modeText}内容的分类：`;

    if (messageId) {
      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboard
      });
    } else {
      await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
    }
  }

  async loadAndShowItems(chatId, messageId, mode, category) {
    const session = this.getSession(chatId);
    session.currentCategory = category;
    session.page = 0;

    let waitingMsg;
    if (messageId) {
      await this.bot.editMessageText('⏳ 正在加载...', {
        chat_id: chatId,
        message_id: messageId
      });
    } else {
      waitingMsg = await this.bot.sendMessage(chatId, '⏳ 正在加载...');
    }

    const items = await this.api.getItems(50, mode, category);
    
    if (items.length > 0) {
      session.items = items;
      await this.showItemsPage(chatId, messageId || waitingMsg?.message_id, session);
    } else {
      const keyboard = {
        inline_keyboard: [[{ text: '🔙 返回', callback_data: 'menu_main' }]]
      };
      
      const message = '❌ 暂无内容，请稍后再试';
      
      if (messageId) {
        await this.bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: keyboard
        });
      } else {
        await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
      }
    }
  }

  async showItemsPage(chatId, messageId, session) {
    const start = session.page * session.pageSize;
    const end = start + session.pageSize;
    const pageItems = session.items.slice(start, end);
    const totalPages = Math.ceil(session.items.length / session.pageSize);
    const currentPage = session.page + 1;

    const categoryNames = {
      'ai-models': '🤖 模型发布',
      'products': '🚀 产品更新',
      'industry': '📰 行业动态',
      'papers': '📄 论文研究',
      'tips': '💡 技巧观点',
      null: '🌐 全部'
    };

    const modeNames = {
      'featured': '✨ 精选',
      'all': '📚 全部'
    };

    let message = `${modeNames[session.currentMode]} · ${categoryNames[session.currentCategory] || ''}\n`;
    message += `📖 第 ${currentPage}/${totalPages} 页（共 ${session.items.length} 条）\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i];
      const num = start + i + 1;
      message += `${num}. ${item.title}\n`;
      if (item.url) {
        message += `   🔗 ${item.url}\n`;
      }
      if (item.summary) {
        message += `   💬 ${item.summary.substring(0, 100)}...\n`;
      }
      message += '\n';
    }

    // 构建翻页键盘
    const keyboardButtons = [];
    
    // 上一页按钮
    if (session.page > 0) {
      keyboardButtons.push({ text: '⬅️ 上一页', callback_data: 'page_prev' });
    }
    
    // 首页按钮
    if (session.page > 1) {
      keyboardButtons.push({ text: '⏮️ 首页', callback_data: 'page_first' });
    }
    
    // 下一页按钮
    if (session.page < totalPages - 1) {
      keyboardButtons.push({ text: '➡️ 下一页', callback_data: 'page_next' });
    }
    
    // 末页按钮
    if (session.page < totalPages - 2) {
      keyboardButtons.push({ text: '⏭️ 末页', callback_data: 'page_last' });
    }

    const keyboard = {
      inline_keyboard: [
        keyboardButtons,
        [{ text: '🔙 返回分类', callback_data: session.currentMode === 'featured' ? 'menu_featured' : 'menu_all' }],
        [{ text: '🏠 主菜单', callback_data: 'menu_main' }]
      ]
    };

    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      disable_web_page_preview: true
    });
  }

  async sendHelpMessage(chatId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🏠 返回主菜单', callback_data: 'menu_main' }]
      ]
    };

    const message = `📖 AIHOT Bot 使用帮助

📋 命令列表：
/start - 显示主菜单
/menu - 显示主菜单
/help - 显示此帮助信息
/daily - 获取最新精编 AI 日报

📂 分类浏览：
🤖 模型发布 - 最新模型更新
🚀 产品更新 - AI 产品动态
📰 行业动态 - 行业资讯
📄 论文研究 - 最新论文
💡 技巧观点 - 使用技巧

💡 小贴士：
- 日报每天北京时间 08:00 自动更新
- 所有内容来自 aihot.virxact.com
- 使用 ⬅️ ➡️ 按钮翻页浏览更多内容
- 点击 🏠 随时返回主菜单`;

    await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
  }

  async handleDailyCommand(chatId, messageId = null) {
    let waitingMsg;
    
    if (messageId) {
      await this.bot.editMessageText('⏳ 正在获取日报...', {
        chat_id: chatId,
        message_id: messageId
      });
    } else {
      waitingMsg = await this.bot.sendMessage(chatId, '⏳ 正在获取日报...');
    }
    
    const dailyData = await this.api.getDailyNews();
    
    const keyboard = {
      inline_keyboard: [[{ text: '🏠 返回主菜单', callback_data: 'menu_main' }]]
    };
    
    if (dailyData) {
      const message = this.api.formatDailyMessage(dailyData);
      if (messageId) {
        await this.bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: keyboard,
          disable_web_page_preview: true
        });
      } else {
        await this.bot.deleteMessage(chatId, waitingMsg.message_id);
        await this.bot.sendMessage(chatId, message, { 
          reply_markup: keyboard,
          disable_web_page_preview: true 
        });
      }
    } else {
      const errorMsg = '❌ 获取日报失败，请稍后再试';
      if (messageId) {
        await this.bot.editMessageText(errorMsg, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: keyboard
        });
      } else {
        await this.bot.editMessageText(errorMsg, {
          chat_id: chatId,
          message_id: waitingMsg.message_id,
          reply_markup: keyboard
        });
      }
    }
  }

  async sendMessage(message, targetChatId = null) {
    try {
      const chatId = targetChatId || this.chatId;
      await this.bot.sendMessage(chatId, message, {
        disable_web_page_preview: true
      });
      console.log('消息发送成功');
      return true;
    } catch (error) {
      console.error('消息发送失败:', error.message);
      return false;
    }
  }

  async pushDailyNews(targetChatId = null) {
    console.log('开始获取每日 AI 热点...');

    if (this.pushMode === 'daily') {
      // 使用日报 API
      const dailyData = await this.api.getDailyNews();
      if (dailyData) {
        const message = this.api.formatDailyMessage(dailyData);
        await this.sendMessage(message, targetChatId);
      } else {
        console.warn('未获取到日报数据');
      }
    } else {
      // 使用精选条目 API
      const items = await this.api.getItems(15, 'featured');
      if (items.length > 0) {
        const message = this.api.formatItemsMessage(items, '今日 AI 精选');
        await this.sendMessage(message, targetChatId);
      } else {
        console.warn('未获取到任何文章');
      }
    }
  }

  runScheduler() {
    if (this.chatId) {
      console.log(`⏰ 定时任务已启动，每天 ${this.scheduledTime} 推送 AI 热点`);
      
      const [hour, minute] = this.scheduledTime.split(':').map(Number);
      
      schedule.scheduleJob({ hour, minute }, async () => {
        await this.pushDailyNews();
      });
    } else {
      console.log('⚠️ 未设置 CHAT_ID，定时任务未启动');
    }
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
  } else if (process.argv.includes('polling')) {
    // 交互模式：启用 polling 并运行定时任务
    bot.runScheduler();
    // 保持进程运行
    process.stdin.resume();
  } else {
    // 正常模式：仅运行定时任务
    bot.runScheduler();
  }
}

main().catch(console.error);
