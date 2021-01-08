
import { InboxRoom } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const chat_get_inbox_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("=====GET INBOX ROOMS=====")
    //Get arguments
    const token = ctx.req.headers.authorization
    const { limit = 10, skip = 0 } = args;
    //Check arguments
    if (!token||!token.trim()) {
        throw new Error("token must be provided")
    }
    //Verify token and get slug
    const slug = await getSlugByToken(token)
    //Query all inboxroom that slug is a member
    const inboxRoomsData: InboxRoom[] = await db.collection(collectionNames.rooms).find({ pair: { $all: [{ slug }] } }).sort({"lastMess.sentAt":-1}).limit(limit).skip(skip).toArray()
    // console.log({ inboxRoomsData })
    console.log(`${inboxRoomsData.length} document was found in the rooms collection`)
    return inboxRoomsData
}

export { chat_get_inbox_rooms }