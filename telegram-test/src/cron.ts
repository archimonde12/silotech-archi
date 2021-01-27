import { CronJob } from 'cron'

export const job = new CronJob('00 25 11 * * *', function() {
    console.log('You will see this message at 11h25');
  }, null, true, 'Asia/Ho_Chi_Minh',"Hello",false);