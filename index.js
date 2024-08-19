const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

//create bot by Telegraf library
const BOT_TOKEN = '7403189572:AAFyeVv0p6c1IaiW1Pb1c0qIYefa-lRe5tE';
const { Telegraf} = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(bot.webhookCallback('/7403189572:AAFyeVv0p6c1IaiW1Pb1c0qIYefa-lRe5tE'));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});
bot.launch()
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