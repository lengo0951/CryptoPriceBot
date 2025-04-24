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
    ctx.reply(`Xin chào ${ctx.from.first_name}! 👋\n\nTôi là Crypto Trading Bot, người bạn đồng hành của bạn trong thị trường tiền điện tử.\n\nTôi có thể giúp bạn:\n- Theo dõi giá các loại tiền điện tử\n- Xem các chỉ báo kỹ thuật\n- Phân tích thị trường\n\nHãy sử dụng các lệnh sau để bắt đầu:\n/price - Tra cứu giá\n/chart - Xem biểu đồ\n/sma - Xem chỉ báo SMA\n\nChúc bạn giao dịch thành công! 🚀`);
});

bot.command('quit', async (ctx) => {
    try {
        await ctx.telegram.leaveChat(ctx.message.chat.id);
        await ctx.reply('Tạm biệt! Hẹn gặp lại bạn lần sau. 👋');
    } catch (error) {
        console.error('Error leaving chat:', error);
        ctx.reply('Xin lỗi, tôi không thể rời khỏi chat lúc này. Vui lòng thử lại sau.');
    }
});

//BTC price
bot.command('BTCUSDT', async (ctx) => {
    log(ctx.from);
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
            params: {
                symbol: 'BTCUSDT'
            }
        });
        const data = response.data;
        const price = parseFloat(data.lastPrice).toFixed(4);
        const priceChangePercent = parseFloat(data.priceChangePercent).toFixed(2);
        const highPrice = parseFloat(data.highPrice).toFixed(4);
        const lowPrice = parseFloat(data.lowPrice).toFixed(4);
        const volume = parseFloat(data.volume).toFixed(2);

        ctx.reply(`💰 Giá Bitcoin hiện tại là ${price} USD\n\n📊 Biến động 24h: ${priceChangePercent}%\n\n📈 Cao nhất 24h: ${highPrice} USD\n📉 Thấp nhất 24h: ${lowPrice} USD\n\n💹 Khối lượng giao dịch 24h: ${volume} BTC`);
    } catch (error) {
        console.error('Error calling API:', error);
        ctx.reply('Xin lỗi, tôi không thể lấy giá Bitcoin lúc này. Vui lòng thử lại sau.');
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
        ctx.reply(`📊 Chỉ báo SMA 100 của Bitcoin trong khung 4 giờ:\n\nGiá trị hiện tại: ${sma[0]} USD\n\n💡 Lưu ý: Đây chỉ là thông tin tham khảo, không phải lời khuyên đầu tư.`);
    } catch (error) {
        console.error('Error calling API:', error);
        ctx.reply('Xin lỗi, tôi không thể tính toán chỉ báo SMA lúc này. Vui lòng thử lại sau.');
    }
});

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

// Thêm command để tra cứu giá của symbol bất kỳ
bot.command('price', async (ctx) => {
    try {
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            return ctx.reply('Vui lòng nhập mã tiền điện tử cần tra cứu.\n\nVí dụ: /price BTCUSDT\n\nDanh sách các mã phổ biến:\n- BTCUSDT: Bitcoin\n- ETHUSDT: Ethereum\n- BNBUSDT: Binance Coin\n- SOLUSDT: Solana\n- XRPUSDT: Ripple');
        }

        const symbol = args[1].toUpperCase();
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
            params: {
                symbol: symbol
            }
        });

        const data = response.data;
        const price = parseFloat(data.lastPrice).toFixed(4);
        const priceChangePercent = parseFloat(data.priceChangePercent).toFixed(2);
        const highPrice = parseFloat(data.highPrice).toFixed(4);
        const lowPrice = parseFloat(data.lowPrice).toFixed(4);
        const volume = parseFloat(data.volume).toFixed(2);

        ctx.reply(`💰 Giá ${symbol} hiện tại là ${price} USD\n\n📊 Biến động 24h: ${priceChangePercent}%\n\n📈 Cao nhất 24h: ${highPrice} USD\n📉 Thấp nhất 24h: ${lowPrice} USD\n\n💹 Khối lượng giao dịch 24h: ${volume} ${symbol.replace('USDT', '')}`);
    } catch (error) {
        console.error('Error calling API:', error);
        if (error.response && error.response.status === 400) {
            ctx.reply('Mã tiền điện tử không hợp lệ. Vui lòng kiểm tra lại.\n\nVí dụ: /price BTCUSDT');
        } else {
            ctx.reply('Xin lỗi, tôi không thể lấy giá lúc này. Vui lòng thử lại sau.');
        }
    }
});

// Thêm command để tra cứu giá với interval
bot.command('chart', async (ctx) => {
    try {
        const args = ctx.message.text.split(' ');
        if (args.length < 3) {
            return ctx.reply('Vui lòng nhập mã tiền điện tử và khung thời gian.\n\nVí dụ: /chart BTCUSDT 4h\n\nCác khung thời gian có sẵn:\n- 1m: 1 phút\n- 5m: 5 phút\n- 15m: 15 phút\n- 1h: 1 giờ\n- 4h: 4 giờ\n- 1d: 1 ngày\n- 1w: 1 tuần');
        }

        const symbol = args[1].toUpperCase();
        const interval = args[2].toLowerCase();

        const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
        if (!validIntervals.includes(interval)) {
            return ctx.reply('Khung thời gian không hợp lệ. Vui lòng chọn một trong các khung sau:\n\n' + validIntervals.join(', '));
        }

        const klinedata = await getKlinedata(symbol, interval);
        const latestPrice = parseFloat(klinedata[klinedata.length - 1].close).toFixed(4);

        ctx.reply(`📊 Giá ${symbol} trong khung ${interval}:\n\nGiá hiện tại: ${latestPrice} USD\n\n💡 Lưu ý: Đây chỉ là thông tin tham khảo, không phải lời khuyên đầu tư.`);
    } catch (error) {
        console.error('Error:', error);
        if (error.response && error.response.status === 400) {
            ctx.reply('Mã tiền điện tử hoặc khung thời gian không hợp lệ. Vui lòng kiểm tra lại.\n\nVí dụ: /chart BTCUSDT 4h');
        } else {
            ctx.reply('Xin lỗi, tôi không thể lấy dữ liệu lúc này. Vui lòng thử lại sau.');
        }
    }
});

// Thiết lập các lệnh cho bot
const commands = [
    { command: 'start', description: 'Bắt đầu sử dụng bot' },
    { command: 'help', description: 'Xem hướng dẫn sử dụng' },
    { command: 'price', description: 'Tra cứu giá tiền điện tử (ví dụ: /price BTCUSDT)' },
    { command: 'chart', description: 'Xem giá theo khung thời gian (ví dụ: /chart BTCUSDT 4h)' },
    { command: 'sma', description: 'Xem chỉ báo SMA 100 của Bitcoin' },
    { command: 'quit', description: 'Tạm biệt bot' }
];

// Cập nhật danh sách lệnh cho bot
bot.telegram.setMyCommands(commands)
    .then(() => console.log('Đã cập nhật danh sách lệnh thành công'))
    .catch(err => console.error('Lỗi khi cập nhật danh sách lệnh:', err));

// Thêm lệnh help để hiển thị hướng dẫn sử dụng
bot.command('help', (ctx) => {
    const helpMessage = `📚 Hướng dẫn sử dụng Crypto Trading Bot 📚

👋 Lệnh cơ bản:
/start - Bắt đầu sử dụng bot
/help - Xem hướng dẫn sử dụng
/quit - Tạm biệt bot

💰 Tra cứu giá:
/price [mã] - Xem giá hiện tại của tiền điện tử
Ví dụ: /price BTCUSDT, /price ETHUSDT

📊 Xem biểu đồ:
/chart [mã] [khung] - Xem giá theo khung thời gian
Ví dụ: /chart BTCUSDT 4h, /chart ETHUSDT 1d

📈 Chỉ báo kỹ thuật:
/sma - Xem chỉ báo SMA 100 của Bitcoin

📌 Danh sách mã tiền điện tử phổ biến:
- BTCUSDT: Bitcoin
- ETHUSDT: Ethereum
- BNBUSDT: Binance Coin
- SOLUSDT: Solana
- XRPUSDT: Ripple
- ADAUSDT: Cardano
- DOTUSDT: Polkadot
- DOGEUSDT: Dogecoin

⏰ Các khung thời gian có sẵn:
- 1m: 1 phút
- 5m: 5 phút
- 15m: 15 phút
- 1h: 1 giờ
- 4h: 4 giờ
- 1d: 1 ngày
- 1w: 1 tuần

💡 Lưu ý:
- Tất cả thông tin chỉ mang tính chất tham khảo
- Không phải lời khuyên đầu tư
- Giá có thể thay đổi theo thời gian thực

Chúc bạn giao dịch thành công! 🚀`;

    ctx.reply(helpMessage);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Webhook URL: ${appUrl}${webhookPath}`);
});