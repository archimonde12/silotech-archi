import { InboxRoomInMongo } from "../../../models/InboxRoom";
import { collectionNames, db } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const chat_get_inbox_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("=====GET INBOX ROOMS=====")
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization
    const { limit = 10, skip = 0 } = args;
    //Check arguments
    if (!token||!token.trim()) {
        throw new Error("token must be provided")
    }
    //Verify token and get slug
    const slug = await getSlugByToken(token)
    //Check slug exist in database
    const findUsersRes = await db
        .collection(collectionNames.users)
        .findOne({ slug })
    if (!findUsersRes) {
        throw new Error(`${slug} not exist in database`)
    }
    //Query all inboxroom that slug is a member
    const inboxRoomsData: InboxRoomInMongo[] = await db.collection(collectionNames.inboxRooms).find({ pair: { $all: [{ slug }] } }).limit(limit).skip(skip).toArray()
    console.log({ inboxRoomsData })
    return inboxRoomsData
}

export { chat_get_inbox_rooms }