
import { InboxRoom } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { getSlugByToken } from "../../../ulti";

const chat_get_inbox_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
    try {
        console.log("=====GET INBOX ROOMS=====")
        //Get arguments
        const token = ctx.req.headers.authorization
        const { pageSize = 10, page = 1 } = args;
        if (pageSize < 1 || page < 1) throw new Error("CA:059")

        //Verify token and get slug
        const slug = await getSlugByToken(token)
        //Query all inboxroom that slug is a member
        const inboxRoomsData: InboxRoom[] = await db.collection(collectionNames.rooms).find({ pair: { $all: [{ slug }] } }).sort({ "lastMess.sentAt": -1 }).limit(pageSize).skip(pageSize * (page - 1)).toArray()
        // console.log({ inboxRoomsData })
        console.log(`${inboxRoomsData.length} document was found in the rooms collection`)
        return inboxRoomsData
    }
    catch (e) {
        console.log(e)
        if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
            throw new Error(e.message)
          } else {
            captureExeption(e, { args })
            throw new Error("CA:004")
          }
    }
}

export { chat_get_inbox_rooms }