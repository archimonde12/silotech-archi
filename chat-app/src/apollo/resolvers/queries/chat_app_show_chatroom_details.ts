import { ObjectId } from "mongodb"
import { client, collectionNames, db } from "../../../mongo"

const chat_app_show_chatroom_details = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======QUERY CHATROOM DETAILS=====")
    //Get arguments
    console.log({ args })
    const { chatRoomId } = args
    const objectChatRoomId = new ObjectId(chatRoomId);
    try {
        //Check chatroom exist
        const foundChatRoom = await db
            .collection(collectionNames.chatRooms)
            .findOne({ _id: objectChatRoomId });
        console.log({ foundChatRoom })
        if (foundChatRoom) {
            //Find all member in chatroom
            let allMemberQuery = { chatRooms: { $elemMatch: { $eq: foundChatRoom._id } } }
            let allMemberData = await db.collection(collectionNames.users).find(allMemberQuery).toArray()
            return {
                data: foundChatRoom,
                member: allMemberData
            }
        }
        throw new Error(`chatroomId not exist`)
    } catch (e) {
        throw e
    }
}

export { chat_app_show_chatroom_details }