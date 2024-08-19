const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

//create bot by Telegraf library
const { Telegraf} = require('telegraf');
const bot = new Telegraf(proces.env.BOT_TOKEN);

//cau hinh webhook
const webhookPath = '/webhook';
app.use(bot.webhookCallback(webhookPath));

// Thiết lập webhook
bot.telegram.setWebhook(`${process.env.APP_URL}${webhookPath}`)
  .then(() => console.log('Webhook đã được thiết lập thành công'))
  .catch(err => console.error('Lỗi khi thiết lập webhook:', err));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

bot.command('start', ctx => {
    console.log(ctx.from);
    bot.telegram.sendMessage(ctx.chat.id, 'Hello there! Welcome to CoolStar Bot', {});
})
bot.command('bitcoin', ctx => {
    var rate;
    console.log(ctx.from);
    axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
    .then(response => {
        console.log(response.data)
        rate = response.data.bitcoin
        const message = `Hello, today the Bitcoin price is ${rate.usd}USD`
        bot.telegram.sendMessage(ctx.chat.id, message, {
        })
    })
})

app.listen(port, () => console.log(`Listening on ${port}`))