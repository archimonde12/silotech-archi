import { checkTimeLimit } from "./config";

export const checkTimeFunc = (timeCheck: number, checkTime: number) => {
  //Check dữ liệu có đảm bảo cập nhật mới nhất hay không
  const now = new Date().getTime();
  return now - timeCheck < checkTime * 1000 * 60;
};

export const createExpireTime = () => {
  let now = new Date().getTime();
  var coeff = 1000 * checkTimeLimit;
  var rounded = (Math.ceil(now / coeff) * coeff) / 1000;
  //Convert to seconds
  return rounded;
};
