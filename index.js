const { log, error } = console;
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const { calculateSMA } = require('./indicatiors');
const { getKlinedata } = require('./dataFetcher');
app.use(express.static('static'))
require('dotenv').config();

//create bot by Telegraf library
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

// Cấu hình webhook
const webhookPath = '/webhook';
const appUrl = process.env.APP_URL || 'https://cryptopricenotifierbot.onrender.com';

// Thêm middleware để xử lý JSON
app.use(express.json());

console.log('Environment:', process.env.NODE_ENV);
console.log('Setting up webhook with URL:', `${appUrl}${webhookPath}`);

// Cấu hình cho môi trường production
if (process.env.NODE_ENV === 'production') {
    // Cấu hình webhook cho production
    app.use(bot.webhookCallback(webhookPath));

    // Thiết lập webhook
    bot.telegram.setWebhook(`${appUrl}${webhookPath}`)
        .then(() => console.log('Webhook đã được thiết lập thành công'))
        .catch(err => console.error('Lỗi khi thiết lập webhook:', err));
} else {
    // Chạy bot ở chế độ polling cho development
    bot.launch();
    console.log('Bot đang chạy ở chế độ polling');
}

// Route chính
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

//start bot
bot.start((ctx) => {
    console.log('Received start command from user:', ctx.from.id);
    ctx.reply('Xin chào! Tôi là Crypto Trading Bot. Tôi có thể giúp bạn theo dõi giá crypto và các chỉ báo kỹ thuật.');
});

bot.command('quit', async (ctx) => {
    // Explicit usage
    await ctx.telegram.leaveChat(ctx.message.chat.id)

    // Using context shortcut
    await ctx.leaveChat()
})
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

//BTC price
bot.command('BTCUSDT', async (ctx) => {
    log(ctx.from);
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price', {
            params: {
                symbol: 'BTCUSDT'
            }
        });
        const btcPrice = parseFloat(response.data.price).toFixed(4);
        bot.telegram.sendMessage(ctx.chat.id, `Gia cua Bitcoin hien tai la ${btcPrice} USD`);
    } catch (error) {
        console.error('Error calling API:', error);
        bot.telegram.sendMessage(ctx.chat.id, 'An error occurred while fetching the Bitcoin price.');
    }
});

//SMA
bot.command('sma', async (ctx) => {
    log(ctx.from);
    try {
        const symbol = 'BTCUSDT';
        const interval = '4h';
        const period = 100;

        const sma = await calculateSMA('BTCUSDT', '4h', 100);
        bot.telegram.sendMessage(ctx.chat.id, `Gia tri SMA 100 trong khung h4 la ${sma[0]} USD`);
    } catch (error) {
        console.error('Error calling API:', error);
        bot.telegram.sendMessage(ctx.chat.id, 'An error occurred while fetching the SMA.');
    }
})
bot.command('concac', async (ctx) => {
    log(ctx.from);
    try {
        const symbol = 'BTCUSDT';
        const interval = '4h';
        const period = 100;
        const name = ctx.chat.first_name;
        const sma = await calculateSMA('BTCUSDT', '4h', 100);
        bot.telegram.sendMessage(ctx.chat.id, `Con cac ne ${name}`);
    } catch (error) {
        console.error('Error calling API:', error);
        bot.telegram.sendMessage(ctx.chat.id, 'An error occurred while fetching the SMA.');
    }
})

app.get('/:symbol/:interval', async (req, res) => {
    try {
        const { symbol, interval } = req.params;
        const klinedata = await getKlinedata(symbol, interval);
        res.status(200).json(klinedata);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Thêm endpoint để kiểm tra webhook
app.get('/webhook-info', async (req, res) => {
    try {
        const webhookInfo = await bot.telegram.getWebhookInfo();
        res.json(webhookInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Thêm endpoint để xóa webhook
app.get('/delete-webhook', async (req, res) => {
    try {
        await bot.telegram.deleteWebhook();
        res.json({ message: 'Webhook đã được xóa thành công' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Webhook URL: ${appUrl}${webhookPath}`);
});