import { ObjectId } from "mongodb"
import { errorMessage } from "../../../config"
import { checkSlugExistInDatabase } from "../../../fakeData/user"
import { client, collectionNames, db } from "../../../mongo"

const chat_app_send_message = async (
    root: any,
    args: any,
    ctx: any
): Promise<any> => {
    //Get agurments
    console.log("======SEND MESSAGE=====")
    console.log({ args })
    const { chatRoomId, slug, content } = args
    const objectChatRoomId = new ObjectId(chatRoomId);
    //Check user exist in database
    const isMemberExist = checkSlugExistInDatabase(slug)
    if (!isMemberExist) {
        throw new Error(errorMessage.userNotExistInDataBase(slug))
    }
    //Start transcation
    const session = client.startSession()
    session.startTransaction()
    try {
        //Check is chatroom exist
        const foundChatRoom = await db
            .collection(collectionNames.chatRooms)
            .findOne({ _id: objectChatRoomId });
        console.log({ foundChatRoom });
        if (foundChatRoom) {
            //check user is a member
            let checkIsOldMemberQuery = { slug, chatRooms: { $all: [foundChatRoom._id] } }
            let checkIsOldMemberRes = await db.collection(collectionNames.users).findOne(checkIsOldMemberQuery)
            console.log({ checkIsOldMemberQuery })
            if (checkIsOldMemberRes) {
                //insert new message document in mongodb
                const now = new Date()
                const insertDoc = {
                    createdBy: { slug },
                    chatRoomId: objectChatRoomId,
                    content,
                    createdAt: now,
                }
                let { insertedId } = await db.collection(collectionNames.messages).insertOne(insertDoc)
                let data = { ...insertDoc, _id: insertedId }
                //update document in chatRooms
               await db.collection(collectionNames.chatRooms).updateOne({ _id: objectChatRoomId }, { $set: { updateAt: now } })

                await session.commitTransaction()
                session.endSession()
                return { success: true, message: `send message success!`, data}
            }
            await session.abortTransaction()
            session.endSession()
            return { success: false, message: `${slug} is not a member in this room`, data: null }
        }
        await session.abortTransaction()
        session.endSession()
        throw new Error(`chatroomId not exist`)
    }
    catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction()
            session.endSession()
        }
        throw e;
    }
}


export { chat_app_send_message }