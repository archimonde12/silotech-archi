import { ObjectId } from "mongodb"
import { client, collectionNames, db } from "../../../mongo"

const chat_app_get_all_inbox_message = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======QUERY ALL INBOX MESSAGE IN INBOXROOM=====")
    //Get arguments
    console.log({ args })
    const { slug, inboxRoomId } = args
    const objectInboxId = new ObjectId(inboxRoomId);
    try {
        //Check is inboxroom exist
        const foundInboxRoom = await db
            .collection(collectionNames.inboxRooms)
            .findOne({ _id: objectInboxId });
        console.log({ foundInboxRoom });
        if (foundInboxRoom) {
            //check user is a member
            let checkIsOldMemberQuery = { slug, inboxRooms: { $all: [foundInboxRoom._id] } }
            let checkIsOldMemberRes = await db.collection(collectionNames.users).findOne(checkIsOldMemberQuery)
            console.log({ checkIsOldMemberRes })
            if (checkIsOldMemberRes) {
                //Query all message
                const inboxMessageQuery = { inboxRoomId: objectInboxId }
                console.log({ inboxMessageQuery })
                const allInboxMessage = await db.collection(collectionNames.inboxMessages).find(inboxMessageQuery).sort({ createdAt: -1 }).toArray()
                console.log({ allInboxMessage })
                return allInboxMessage
            }
            throw new Error(`${slug} is not in this inboxRoom`)
        }
        throw new Error(`inboxRoomId not exist`)
    } catch (e) {
        throw e
    }
}

export { chat_app_get_all_inbox_message }