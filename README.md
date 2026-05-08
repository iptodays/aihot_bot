# AIHOT Telegram Bot

每日自动推送 AI 热点资讯的 Telegram Bot，数据来源：https://aihot.virxact.com/

## 功能

- 每日自动从 AIHOT 获取热点资讯（使用官方 REST API）
- 支持两种推送模式：精编日报 或 精选条目
- 定时推送到指定的 Telegram 频道或群组
- 支持测试模式，可立即推送一次
- 美观的消息格式化，带表情符号分类

## 安装

1. 克隆或下载项目文件

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入以下信息：
- `BOT_TOKEN`: 你的 Telegram Bot Token
- `CHAT_ID`: 目标频道或聊天的 ID
- `SCHEDULED_TIME`: 每日推送时间（24小时制，例如：09:00）
- `AIHOT_URL`: AIHOT 网站地址（默认：https://aihot.virxact.com）
- `PUSH_MODE`: 推送模式，"daily"（日报）或 "items"（精选条目）

## 获取 Token 和 Chat ID

### 获取 Bot Token
1. 在 Telegram 中搜索 @BotFather
2. 发送 `/newbot` 创建新机器人
3. 按照提示设置机器人名称和用户名
4. 获取 API Token

### 获取 Chat ID
1. 将你的机器人添加到频道或群组
2. 在频道中发送一条消息
3. 访问 `https://api.telegram.org/bot<你的token>/getUpdates`
4. 在返回的 JSON 中找到 `chat.id` 字段

## 使用

### 正常运行（定时推送）
```bash
npm start
# 或者
node bot.js
```

### 测试模式（立即推送）
```bash
npm test
# 或者
node bot.js test
```

## 推送模式

### Daily 模式（默认）
使用 `/api/public/daily` 接口，获取每日精编的 AI 日报，包含：
- 🤖 模型发布/更新
- 🚀 产品发布/更新  
- 📰 行业动态
- 📄 论文研究
- 💡 技巧与观点
- ⚡ 快讯

### Items 模式
使用 `/api/public/items` 接口，获取精选热点条目

## 部署

推荐使用 PM2 来保持 bot 持续运行：

### 使用 PM2
```bash
# 全局安装 PM2
npm install -g pm2

# 启动 bot
pm2 start bot.js --name aihot-bot

# 查看状态
pm2 status

# 查看日志
pm2 logs aihot-bot

# 设置开机自启
pm2 startup
pm2 save
```

## 项目结构

```
.
├── bot.js              # 主程序文件
├── aihot-api.js        # API 客户端模块
├── package.json        # Node.js 项目配置
├── .env.example        # 环境变量示例
├── .gitignore         # Git 忽略文件
├── README.md          # 说明文档
└── LICENSE            # 许可证
```

## API 说明

本项目使用 AIHOT 官方提供的 REST API：

- `/api/public/daily` - 获取最新日报
- `/api/public/items` - 获取热点条目
- `/api/public/dailies` - 获取日报索引

无需 API Token，匿名访问即可。详细文档：https://aihot.virxact.com/agent

## 注意事项

- 确保机器人有发送消息到目标频道的权限
- 频道 ID 通常以 -100 开头
- 建议使用测试模式先验证配置是否正确
- 定期检查日志，确保 bot 正常运行
- API 有频率限制（600请求/分钟），请勿滥用

## 许可证

MIT License
