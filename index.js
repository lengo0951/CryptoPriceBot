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

//for deploy turn on codes below
const webhookPath = '/webhook';
app.use(bot.webhookCallback(webhookPath));
// Thiết lập webhook
bot.telegram.setWebhook(`${process.env.APP_URL}${webhookPath}`)
    .then(() => console.log('Webhook đã được thiết lập thành công'))
    .catch(err => console.error('Lỗi khi thiết lập webhook:', err));
//local turn on line below
// bot.launch();
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});
//start bot
bot.start((ctx) => ctx.reply('Hello there! Welcome to CoolStar Bot'))
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
app.listen(process.env.PORT || 5000, () => console.log('Server is running'));