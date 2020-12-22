import { ObjectId } from "mongodb"
import { client, collectionNames, db } from "../../../mongo"

const chat_app_get_all_message = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======QUERY ALL MESSAGE IN CHATROOM=====")
    //Get arguments
    console.log({ args })
    const { slug,chatRoomId } = args
    const objectChatRoomId = new ObjectId(chatRoomId);
    //Start transaction
    const session = client.startSession()
    session.startTransaction()
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
             console.log({ checkIsOldMemberQuery })
             if (checkIsOldMemberRes) {}
             await session.abortTransaction()
             session.endSession()
             return { success: false, message: `${slug} is not a member in this room`, data: null }
        }
        await session.abortTransaction()
        session.endSession()
        throw new Error(`chatroomId not exist`)
    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction()
            session.endSession()
        }
        throw e
    }
}

export { chat_app_get_all_message }