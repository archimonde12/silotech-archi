import { ObjectId } from "mongodb"
import { errorMessage } from "../../../config"
import { checkSlugExistInDatabase } from "../../../fakeData/user"
import { client, collectionNames, db } from "../../../mongo"

const chat_app_send_inbox_message = async (
    root: any,
    args: any,
    ctx: any
): Promise<any> => {
    //Get agurments
    console.log("======SEND INBOX MESSAGE=====")
    console.log({ args })
    const { inboxRoomId, slug, content } = args
    const objectInboxId = new ObjectId(inboxRoomId);
    //Check user exist in database
    const isMemberExist = checkSlugExistInDatabase(slug)
    if (!isMemberExist) {
        throw new Error(errorMessage.userNotExistInDataBase(slug))
    }
    //Start transcation
    const session = client.startSession()
    session.startTransaction()
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
                //insert new inbox message document in mongodb
                const now = new Date()
                const insertDoc = {
                    createdBy: { slug },
                    inboxRoomId: objectInboxId,
                    content,
                    createdAt: now,
                }
                let { insertedId } = await db.collection(collectionNames.inboxMessages).insertOne(insertDoc)
                let data = { ...insertDoc, _id: insertedId }
                //update document in inboxRooms
                await db.collection(collectionNames.inboxRooms).updateOne({ _id: objectInboxId }, { $set: { updateAt: now } })
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
        throw new Error(`inboxRoomId not exist`)
    }
    catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction()
            session.endSession()
        }
        throw e;
    }
}

export { chat_app_send_inbox_message }