import { createClient, RedisClient } from "redis"
import { promisify } from "util";
import { redisAuth, redisPort, redisUri } from "./config"

export let redis: RedisClient
export let getAsync:(key:string)=>Promise<string|null>
export let setAsync:(key:string,val:string)=>Promise<any>
export let existsAsync:(keys:string[])=>Promise<number>
const retry_delay = 1000;

export const initRedis = async () => {
    new Promise<void>((resolve, reject) => {
        redis = createClient({
            host: redisUri,
            port: redisPort,
            no_ready_check: true,
        })

        redis.on("connect", () => {
            console.log("🌐 redis connected");
            getAsync = promisify(redis.get).bind(redis);
            setAsync=promisify(redis.set).bind(redis)
            existsAsync=promisify(redis.EXISTS).bind(redis)
            resolve();
          });

        redis.auth(redisAuth, function (err, response) {
            if (err) {
                console.log("auth:", err);
            }
        })

        redis.on("error", function (error) {
            console.error(error);

            console.log(" redis not connected");

            redis.end(true);

            console.log(`retry connecting redis in 1s ...`);

            setTimeout(() => {
                redis = createClient({
                    url: redisUri,
                    no_ready_check: true,
                });
            }, retry_delay);
        });
    })
}