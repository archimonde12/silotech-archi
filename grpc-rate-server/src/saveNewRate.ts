import { trxusdtRateURL, target_currency, key, saveDataPeriod } from "./config";
import axios from "axios";
import { setAsync } from "./redis";

const saveNewRate = async () => {
  try {
    let now = new Date().toISOString();
    const url = 'https://api.coingecko.com/api/v3/exchanges/binance/tickers?coin_ids=tron&page=1';
    const { data } = await axios.get(url);
    let result = data.tickers.find(value => value.target === target_currency)
    const saveData = {
      rate: result.last,
      update_at: result.last_traded_at,
      create_at: now,
    };
    const saveRes = await setAsync(key, JSON.stringify(saveData));
    if (saveRes === "OK") {
      console.log("Update new TRX/USDT rate SUCCESSFUL");
      return true;
    } else {
      console.log("FAIL to update new rate ");
      return false;
    }
  } catch (e) {
    throw e;
  }
};

export const routineUpdateNewRate = () => {
  setTimeout(async () => {
    await saveNewRate();
    routineUpdateNewRate();
  }, saveDataPeriod * 1000);
};
