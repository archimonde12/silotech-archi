import {
  key,
  fakeUserAPI,
  checkTimeLimit,
  countLimit,
  appName,
} from "./config";
import {
  getAsync,
  incrAsync,
  expireAsync,
  ttlAsync,
  decrAsync,
  setAsync,
  delAsync,
  setExpireAsync,
  redis,
} from "./redis";
import { checkTimeFunc, createExpireTime } from "./util";

export let tempApiStatus: any[] = [];

const limitApiCall = async () => {
  try {
    const countKey: string = `${appName}.${fakeUserAPI}.count`;
    const statusKey: string = `${appName}.${fakeUserAPI}.status`;
    const getCountRes = await incrAsync(countKey);
    const currentCount = Number(getCountRes);
    if (currentCount === 1) {
      redis
        .multi()
        .set(statusKey, "1")
        .expireat(statusKey, createExpireTime())
        .expireat(countKey, createExpireTime())
        .exec();
      // await setExpireAsync(statusKey, checkTimeLimit, "1");
      // await expireAsync(countKey, checkTimeLimit);
      return true;
    }
    if (currentCount > countLimit) {
      redis.multi().del([statusKey]).decr(countKey).exec();
      // await delAsync([statusKey]);
      // await decrAsync(countKey);
      return false;
    }
    return true;
  } catch (e) {
    throw e;
  }
};

const checkLocal = (api: string) => {
  //Problem: When restart it disappear
  //Check is api exist in local
  let index = tempApiStatus.findIndex(({ apiKey }) => apiKey === api);
  let result: {
    apiKey: string;
    count: number;
    expireAt: number;
    active: boolean;
  };
  //If exist
  if (index > -1) {
    let now = new Date().getTime() / 1000; //Convert to seconds
    //Check expire
    let isExpire = now > tempApiStatus[index].expireAt;
    //If expire => re-create
    if (isExpire) {
      tempApiStatus[index].expireAt = createExpireTime();
      tempApiStatus[index].count = 1;
      tempApiStatus[index].active = true;
      return tempApiStatus[index];
    }
    //Check count limit
    let isCountLimit = tempApiStatus[index].count >= countLimit;
    //If limit => set active = false
    if (isCountLimit) {
      tempApiStatus[index].active = false;
      return tempApiStatus[index];
    }
    //If not limit => count++
    tempApiStatus[index].count++;
    return tempApiStatus[index];
  } else {
    //If not exist create new one
    result = {
      apiKey: api,
      count: 1,
      expireAt: createExpireTime(),
      active: true,
    };
    tempApiStatus.push(result);
    return result;
  }
};

//Dùng chỉ local var
export const getRate = async (checkTime: number) => {
  try {
    const now: number = new Date().getTime()
    const countKey: string = `${appName}.${fakeUserAPI}.count`;
    let check: {
      apiKey: string;
      count: number;
      expireAt: number;
      active: boolean;
    } = checkLocal(fakeUserAPI);
    if (!check.active) {
      return {
        success: false,
        message: `Error 429:Out of limit  ${countLimit} requests per ${checkTimeLimit} seconds`,
        count: check.count,
        update_at: null,
        create_at: null,
      };
    }
    let status: boolean = await limitApiCall();
    if (status) {
      let data = await getAsync(key);
      if (data) {
        let redisRes = JSON.parse(data);
        let updateAtTime = new Date(redisRes.update_at).getTime();
        let isCheckTimePass = checkTimeFunc(updateAtTime, checkTime);
        if (isCheckTimePass) {
          return {
            success: isCheckTimePass,
            message: "server response!",
            rate: redisRes.rate,
            update_at: redisRes.update_at,
            create_at: redisRes.create_at,
            count: check.count,
            remain: countLimit - check.count,
            reactiveAt: check.expireAt - Math.round(now / 1000),
            code: 200
          };
        }
        return {
          success: isCheckTimePass,
          message: "Data were expired! Waitting for new data",
          count: check.count,
          rate: null,
          update_at: null,
          create_at: null,
          remain: countLimit - check.count,
          reactiveAt: check.expireAt - Math.round(now / 1000),
          code: 200
        };
      }
    } else {
      return {
        success: false,
        message: `Error 429:Out of limit  ${countLimit} requests per ${checkTimeLimit} seconds`,
        count: check.count,
        rate: null,
        update_at: null,
        create_at: null,
        remain: countLimit - check.count,
        reactiveAt: check.expireAt - Math.round(now / 1000),
        code: 200
      };
    }
  } catch (e) {
    return {
      success: false,
      message: e,
      count: 0,
      rate: null,
      update_at: null,
      create_at: null,
      remain: null,
      reactiveAt: null,
      code: null
    }
  }
};


