const axios = require('axios');
const { log, error } = console;

const getKlinedata = async (symbol, interval, limit=100) => {
    try {
        const resp = await axios.get('https://api.binance.com/api/v3/klines', {
            params: {
                symbol: symbol,
                interval: interval,
                limit: limit
            }
        });
        const data = resp.data;
        const klinedata = data.map(d => ({
            time: d[0] / 1000,
            open: d[1],
            high: d[2],
            low: d[3],
            close: d[4],
            volume: d[5]
        }));
        return klinedata;
    } catch (err) {
        error("Failed to fetch data:", err);
        throw err;
    }
};

module.exports = { getKlinedata };