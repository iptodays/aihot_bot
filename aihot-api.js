const axios = require('axios');

class AIHotAPI {
  constructor(baseUrl = 'https://aihot.virxact.com') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'AIHOT-Telegram-Bot/1.0 (+https://github.com/your-repo)'
      }
    });
  }

  async getDailyNews() {
    try {
      const url = `${this.baseUrl}/api/public/daily`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      console.error('获取日报失败:', error.message);
      return null;
    }
  }

  async getItems(take = 10, mode = 'featured', category = null) {
    try {
      const url = `${this.baseUrl}/api/public/items`;
      const params = {
        take: Math.min(take, 100),
        mode
      };
      if (category) {
        params.category = category;
      }
      
      const response = await this.client.get(url, { params });
      return response.data.items || [];
    } catch (error) {
      console.error('获取条目失败:', error.message);
      return [];
    }
  }

  formatDailyMessage(dailyData) {
    if (!dailyData) {
      return '暂无日报数据';
    }

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
    message += `来源: ${this.baseUrl}\n`;

    return message;
  }

  formatItemsMessage(items, title = '今日 AI 热点') {
    if (!items || items.length === 0) {
      return '暂无热点数据';
    }

    let message = `🔥 ${title}\n`;
    message += '='.repeat(40) + '\n\n';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemTitle = item.title || '';
      const url = item.url || '';
      const summary = item.summary || '';

      message += `${i + 1}. ${itemTitle}\n`;
      if (url) {
        message += `   链接: ${url}\n`;
      }
      if (summary) {
        message += `   摘要: ${summary.substring(0, 120)}...\n`;
      }
      message += '\n';
    }

    message += '='.repeat(40) + '\n';
    message += `来源: ${this.baseUrl}\n`;

    return message;
  }
}

module.exports = AIHotAPI;
