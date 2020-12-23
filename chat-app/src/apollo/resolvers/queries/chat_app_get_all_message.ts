import { ObjectId } from "mongodb"
import { client, collectionNames, db } from "../../../mongo"

const chat_app_get_all_message = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======QUERY ALL MESSAGE IN CHATROOM=====")
    //Get arguments
    console.log({ args })
    const { slug, chatRoomId } = args
    const objectChatRoomId = new ObjectId(chatRoomId);
    try {
        //Check chatroom exist
        const foundChatRoom = await db
            .collection(collectionNames.chatRooms)
            .findOne({ _id: objectChatRoomId });
        console.log({ foundChatRoom })
        if (foundChatRoom) {
            //check user is a member
            let checkIsOldMemberQuery = { slug, chatRooms: { $all: [foundChatRoom._id] } }
            let checkIsOldMemberRes = await db.collection(collectionNames.users).findOne(checkIsOldMemberQuery)
            console.log({ checkIsOldMemberRes })
            if (checkIsOldMemberRes) {
                //Query all message
                const messageQuery = { chatRoomId: objectChatRoomId }
                console.log({ messageQuery })
                const allMessage = await db.collection(collectionNames.messages).find(messageQuery).sort({ createdAt: -1 }).toArray()
                console.log({ allMessage })
                return allMessage
            }
            throw new Error(`${slug} is not a member in this room`)
        }
        throw new Error(`chatroomId not exist`)
    } catch (e) {
        throw e
    }
}

export { chat_app_get_all_message }