import { config } from "dotenv";

config();

// if (!process.env.TRXUSDTRATEURL) throw new Error(`TRXUSDTRATEURL invalid`);
export const trxusdtRateURL = process.env.TRXUSDTRATEURL;

export const redisUri =
  process.env.REDIS || "redis-15381.c245.us-east-1-3.ec2.cloud.redislabs.com";
export const redisPort = 15381; 
export const redisAuth = process.env.AUTH || `0xCDbcCuRusFwrpSVOKzQTV2bVgOax1J`;

// if (!process.env.REDISLOCAL) throw new Error(`REDISLOCAL invalid`);
export const redisLocalUri = process.env.REDISLOCAL;
export const redisLocalPort = 6379;

export const key = "rateTRXUSDT.trx.usdt.rate";

// if (!process.env.MONGO) throw new Error(`MONGO invalid`);
export const mongoUri = process.env.MONGO;

export const target_currency = "USDT";
export const saveDataPeriod = 10; //seconds
export const fakeUserAPI = "fakeUserAPI";
export const appName = "rateTRXUSDT";

export const countLimit = 5;
export const checkTimeLimit = 60; //seconds
