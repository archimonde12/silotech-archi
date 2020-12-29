import { InboxRoomInMongo } from "../../../models/InboxRoom";
import { collectionNames, db } from "../../../mongo";

const get_inbox_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("=====GET INBOX ROOMS=====")
    //Get arguments
    console.log({ args });
    const { slug, limit, skip } = args;
    //Check slug empty
    if (!slug.trim()) {
        throw new Error("slug must be provided")
    }
    //Check slug exist in database
    const findUsersRes = await db
        .collection(collectionNames.users)
        .findOne({ slug })
    if (!findUsersRes) {
        throw new Error(`${slug} not exist in database`)
    }
    //Query all inboxroom that slug is a member
    const inboxRoomsData:InboxRoomInMongo[] = await db.collection(collectionNames.inboxRooms).find({ pair: { $all: [{slug}] } }).toArray()
    console.log({ inboxRoomsData })
    return inboxRoomsData
}

export {get_inbox_rooms}