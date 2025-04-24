const { getKlinedata } = require('./dataFetcher');
const SMA = require('technicalindicators').SMA;

const calculateSMA = async (symbol, interval, period) => {
    try {
        // Lấy dữ liệu kline từ Binance
        const klinedata = await getKlinedata(symbol, interval);
        
        // Chuyển đổi giá đóng cửa thành số thực
        const closePrices = klinedata.map(data => parseFloat(data.close));
        // Kiểm tra xem có đủ số phiên để tính SMA không
        if (closePrices.length < period) {
            throw new Error('Không đủ phiên để tính SMA');
        }
        // Tính toán SMA
        const sma = SMA.calculate({ period: period, values: closePrices });
        return sma;
    } catch (err) {
        // Xử lý lỗi và ném lỗi lên
        throw new Error(`Lỗi khi tính toán SMA: ${err.message}`);
    }
};

module.exports = { calculateSMA };