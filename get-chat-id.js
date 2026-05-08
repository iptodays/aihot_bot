require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

console.log('=== AIHOT Bot Chat ID 获取工具 ===\n');
console.log('Bot Token:', process.env.BOT_TOKEN ? '已设置' : '未设置');

if (!process.env.BOT_TOKEN) {
  console.error('❌ 请先在 .env 文件中设置 BOT_TOKEN');
  process.exit(1);
}

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

console.log('✅ Bot 已启动！');
console.log('\n📋 请尝试以下任一方式：');
console.log('1️⃣  直接和这个 Bot 私聊发送任意消息');
console.log('2️⃣  在你要推送的群组中发送任意消息（确保 bot 在群组中）');
console.log('3️⃣  如果你用的是频道，请先把 bot 设为管理员，然后频道中发消息');
console.log('\n⏱️  等待中...（发送 /start 给 bot 也行）\n');

// 捕获所有消息类型
bot.on('message', (msg) => {
  console.log('\n🎉 收到消息！');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Chat ID:', msg.chat.id);
  console.log('Chat 类型:', msg.chat.type);
  console.log('Chat 标题:', msg.chat.title || '无标题');
  console.log('发送者:', msg.from.first_name, msg.from.last_name || '');
  console.log('消息内容:', msg.text || '(非文本消息)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ 请将这个 Chat ID 填入 GitHub Secrets 中的 CHAT_ID');
  console.log('\n💡 提示：');
  console.log('- 如果是频道，Chat ID 通常以 -100 开头');
  console.log('- 如果是群组，Chat ID 通常以 - 开头');
  console.log('- 如果是私聊，Chat ID 是正数');
  console.log('\n按 Ctrl+C 退出');
});

// 捕获频道帖子（如果是频道）
bot.on('channel_post', (msg) => {
  console.log('\n🎉 收到频道消息！');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Chat ID:', msg.chat.id);
  console.log('Chat 类型:', msg.chat.type);
  console.log('Chat 标题:', msg.chat.title || '无标题');
  console.log('消息内容:', msg.text || '(非文本消息)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ 请将这个 Chat ID 填入 GitHub Secrets 中的 CHAT_ID');
  console.log('\n按 Ctrl+C 退出');
});

// 错误处理
bot.on('polling_error', (error) => {
  console.error('\n❌ Polling 错误:', error.message);
  console.error('请检查 Bot Token 是否正确');
});

bot.on('error', (error) => {
  console.error('\n❌ 错误:', error.message);
});

// 超时提示
setTimeout(() => {
  console.log('\n⚠️  等待超过 30 秒还没收到消息...');
  console.log('\n💡 请检查：');
  console.log('1. Bot 是否在你的群组/频道中？');
  console.log('2. 如果是频道，Bot 是否是管理员且有发送消息权限？');
  console.log('3. 试试直接私聊 Bot 发送 /start');
  console.log('\n继续等待中...\n');
}, 30000);
