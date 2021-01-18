import { createClient, RedisClient } from "redis";
import { promisify } from "util";
import { redisUri, redisPort, redisAuth } from "./config";

export let redis: RedisClient;
export let pub: RedisClient;
export let sub: RedisClient;
export let getKeys: (pattern: string) => Promise<string[]>;
export let getAsync: (key: string) => Promise<string | null>;
export let setAsync: (key: string, val: string) => Promise<any>;
export let delAsync: (keys: string[]) => Promise<any>;
export let incrAsync: (key: string) => Promise<any>;
export let decrAsync: (key: string) => Promise<any>;
export let rpushAsync: (key: string, val: string) => Promise<number>;
export let ltrimAsync: (
  key: string,
  start: number,
  stop: number
) => Promise<any>;
export let lrangeAsync: (
  key: string,
  start: number,
  stop: number
) => Promise<any>;
export let expireAsync: (key: string, seconds: number) => Promise<any>;
export let setExpireAsync: (
  key: string,
  seconds: number,
  val: string
) => Promise<any>;
export let ttlAsync: (key: string) => Promise<number>;
export let multiAsync;
const retry_delay = 1000;

export const connectRedis = async () =>
  new Promise((resolve, reject) => {
    redis = createClient({
      host: redisUri,
      port: redisPort,
      no_ready_check: true,
    });

    redis.auth(redisAuth, function (err, response) {
      if (err) {
        console.log("auth:", err);
      }
    });

    redis.on("connect", () => {
      console.log("redis connected");

      getKeys = promisify(redis.keys).bind(redis);
      getAsync = promisify(redis.get).bind(redis);
      setAsync = promisify(redis.set).bind(redis);
      delAsync = promisify(redis.del).bind(redis);
      incrAsync = promisify(redis.incr).bind(redis);
      decrAsync = promisify(redis.decr).bind(redis);
      rpushAsync = promisify(redis.rpush).bind(redis);
      ltrimAsync = promisify(redis.ltrim).bind(redis);
      lrangeAsync = promisify(redis.lrange).bind(redis);
      expireAsync = promisify(redis.expire).bind(redis);
      setExpireAsync = promisify(redis.setex).bind(redis);
      redis.WATCH()
      ttlAsync = promisify(redis.ttl).bind(redis);
      multiAsync = redis.multi();
      resolve();
    });

    redis.on("error", function (error) {
      console.error(error);

      console.log("redis not connected");

      redis.end(true);

      console.log(`retry connecting redis in 1s ...`);

      setTimeout(() => {
        redis = createClient({
          url: redisUri,
          no_ready_check: true,
        });
      }, retry_delay);
    });
  });
