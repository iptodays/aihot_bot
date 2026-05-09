// Cloudflare Workers 版本的 AIHOT Bot
const AIHOT_API_BASE = 'https://aihot.virxact.com';

// 全局状态，每个请求会重新初始化
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

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method !== 'POST') {
    return new Response('AIHOT Bot is running!', { status: 200 });
  }

  try {
    const update = await request.json();
    await handleUpdate(update);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Error', { status: 500 });
  }
}

async function handleUpdate(update) {
  // 处理普通消息
  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text || '';
    
    if (text.startsWith('/start') || text.startsWith('/menu')) {
      await sendMainMenu(chatId);
    } else if (text.startsWith('/help')) {
      await sendHelpMessage(chatId);
    } else if (text.startsWith('/daily')) {
      await handleDailyCommand(chatId);
    }
  }
  // 处理回调查询（按钮点击）
  else if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const action = callbackQuery.data;

    // 回答回调查询
    await answerCallbackQuery(callbackQuery.id);

    switch (action) {
      case 'menu_main':
        await editMainMenu(chatId, messageId);
        break;
      case 'menu_daily':
        await handleDailyCommand(chatId, messageId);
        break;
      case 'menu_featured':
        await showCategoryMenu(chatId, messageId, 'featured');
        break;
      case 'menu_all':
        await showCategoryMenu(chatId, messageId, 'all');
        break;
      case 'category_all':
        await loadAndShowItems(chatId, messageId, 'featured', null);
        break;
      case 'category_models':
        await loadAndShowItems(chatId, messageId, 'featured', 'ai-models');
        break;
      case 'category_products':
        await loadAndShowItems(chatId, messageId, 'featured', 'products');
        break;
      case 'category_industry':
        await loadAndShowItems(chatId, messageId, 'featured', 'industry');
        break;
      case 'category_papers':
        await loadAndShowItems(chatId, messageId, 'featured', 'papers');
        break;
      case 'category_tips':
        await loadAndShowItems(chatId, messageId, 'featured', 'tips');
        break;
    }
  }
}

// API 请求
async function fetchDaily() {
  const response = await fetch(`${AIHOT_API_BASE}/api/public/daily`, {
    headers: {
      'User-Agent': 'AIHOT-Bot-Cloudflare/1.0'
    }
  });
  return await response.json();
}

async function fetchItems(take = 15, mode = 'featured', category = null) {
  const params = new URLSearchParams({
    take: Math.min(take, 50),
    mode
  });
  if (category) params.append('category', category);
  
  const response = await fetch(`${AIHOT_API_BASE}/api/public/items?${params}`, {
    headers: {
      'User-Agent': 'AIHOT-Bot-Cloudflare/1.0'
    }
  });
  const data = await response.json();
  return data.items || [];
}

// Telegram API 调用
async function sendMessage(chatId, text, replyMarkup = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const body = {
    chat_id: chatId,
    text: text,
    disable_web_page_preview: true
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function editMessageText(chatId, messageId, text, replyMarkup = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
  
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    disable_web_page_preview: true
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function answerCallbackQuery(callbackQueryId) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId
    })
  });
}

// 消息生成
async function sendMainMenu(chatId) {
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

  await sendMessage(chatId, message, keyboard);
}

async function editMainMenu(chatId, messageId) {
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

  await editMessageText(chatId, messageId, message, keyboard);
}

async function showCategoryMenu(chatId, messageId, mode) {
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

  await editMessageText(chatId, messageId, message, keyboard);
}

async function loadAndShowItems(chatId, messageId, mode, category) {
  await editMessageText(chatId, messageId, '⏳ 正在加载...');
  
  const items = await fetchItems(15, mode, category);
  
  if (items.length > 0) {
    let message = `${modeNames[mode]} · ${categoryNames[category] || ''}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (let i = 0; i < Math.min(items.length, 10); i++) {
      const item = items[i];
      message += `${i+1}. ${item.title}\n`;
      if (item.url) {
        message += `   🔗 ${item.url}\n`;
      }
      if (item.summary) {
        message += `   💬 ${item.summary.substring(0, 100)}...\n`;
      }
      message += '\n';
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔙 返回分类', callback_data: mode === 'featured' ? 'menu_featured' : 'menu_all' }],
        [{ text: '🏠 主菜单', callback_data: 'menu_main' }]
      ]
    };

    await editMessageText(chatId, messageId, message, keyboard);
  } else {
    const keyboard = {
      inline_keyboard: [[{ text: '🔙 返回', callback_data: 'menu_main' }]]
    };
    
    const message = '❌ 暂无内容，请稍后再试';
    await editMessageText(chatId, messageId, message, keyboard);
  }
}

async function sendHelpMessage(chatId) {
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
- 点击 🏠 随时返回主菜单`;

  await sendMessage(chatId, message, keyboard);
}

async function handleDailyCommand(chatId, messageId = null) {
  if (messageId) {
    await editMessageText(chatId, messageId, '⏳ 正在获取日报...');
  } else {
    await sendMessage(chatId, '⏳ 正在获取日报...');
  }
  
  const dailyData = await fetchDaily();
  
  const keyboard = {
    inline_keyboard: [[{ text: '🏠 返回主菜单', callback_data: 'menu_main' }]]
  };
  
  if (dailyData) {
    const message = formatDailyMessage(dailyData);
    if (messageId) {
      await editMessageText(chatId, messageId, message, keyboard);
    } else {
      await sendMessage(chatId, message, keyboard);
    }
  } else {
    const errorMsg = '❌ 获取日报失败，请稍后再试';
    if (messageId) {
      await editMessageText(chatId, messageId, errorMsg, keyboard);
    } else {
      await sendMessage(chatId, errorMsg, keyboard);
    }
  }
}

function formatDailyMessage(dailyData) {
  const date = dailyData.date || '';
  const lead = dailyData.lead || '今日 AI 热点';

  let message = `🔥 ${lead}\n`;
  message += `📅 日期: ${date}\n`;
  message += '='.repeat(40) + '\n\n';

  const sections = dailyData.sections || [];
  const sectionLabels = {
    '模型发布/更新': '🤖 模型',
    '产品发布/更新': '🚀 产品',
    '行业动态': '📰 行业',
    '论文研究': '📄 论文',
    '技巧与观点': '💡 技巧'
  };

  for (const section of sections) {
    const label = section.label || '';
    const items = section.items || [];

    if (items.length > 0) {
      const displayLabel = sectionLabels[label] || label;
      message += `${displayLabel}\n`;

      for (let i = 0; i < Math.min(items.length, 5); i++) {
        const item = items[i];
        const title = item.title || '';
        const url = item.url || '';
        message += `${i + 1}. ${title}\n`;
        if (url) {
          message += `   ${url}\n`;
        }
      }
      message += '\n';
    }
  }

  // 快讯
  const flashes = dailyData.flashes || [];
  if (flashes.length > 0) {
    message += '⚡ 快讯\n';
    for (let i = 0; i < Math.min(flashes.length, 3); i++) {
      const flash = flashes[i];
      const title = flash.title || '';
      const url = flash.url || '';
      message += `${i + 1}. ${title}\n`;
      if (url) {
        message += `   ${url}\n`;
      }
    }
    message += '\n';
  }

  message += '='.repeat(40) + '\n';
  message += `来源: ${AIHOT_API_BASE}\n`;

  return message;
}
