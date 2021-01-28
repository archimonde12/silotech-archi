import { CronJob } from "cron"
import { collectionNames, db } from "../mongo";

export const cron_auto_delete_logs = new CronJob('30 * * * * *', async function () {
    try {
        const delRes = await db.collection(collectionNames.logs).deleteMany({})
        console.log(`CRON JOB : ${delRes.deletedCount} document(s) was/were deleted from logs collection`)
    }
    catch (e) {
        console.log(e)
    }
}, null, true, 'Asia/Ho_Chi_Minh');

