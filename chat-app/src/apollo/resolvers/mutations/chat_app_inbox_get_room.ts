import { client, collectionNames, db } from "../../../mongo"
import { Users, checkSlugExistInDatabase } from "../../../fakeData/user"
import { createPairName, deCryptPairName } from "../../../utils"

const chat_app_inbox_get_room = async (root: any, args: any, ctx: any): Promise<any> => {
    //Get agurments
    console.log("======GET INBOX ROOM=====")
    console.log({ args })
    const { sender, reciver } = args
    //Check sender and reciver is exist in database
    console.log({ senderExist: checkSlugExistInDatabase(sender) })
    console.log({ reciverExist: checkSlugExistInDatabase(reciver) })
    if (!checkSlugExistInDatabase(sender)) {
        throw new Error(`${sender} not exist in users database`)
    }
    if (!checkSlugExistInDatabase(reciver)) {
        throw new Error(`${reciver} not exist in users database`)
    }
    let combineName = createPairName(sender, reciver)
    console.log({ combineName })
    let members = deCryptPairName(combineName)
    console.log({ members })
    //Start transaction
    const session = client.startSession()
    session.startTransaction()
    try {
        //Get inboxRoom
        const inboxRoom = await db.collection(collectionNames.inboxRooms).findOne({ pairName: combineName })
        console.log({ inboxRoom })
        if (!inboxRoom) {
            const now = new Date()
            const InboxRoomDoc = {
                pairName: combineName,
                members: members,
                createdAt: now,
                updateAt: now,
            }
            //Create new one if inboxRoom not exist
            const newInboxRoom = await db.collection(collectionNames.inboxRooms).insertOne(InboxRoomDoc)
            await db.collection(collectionNames.users).updateOne({ slug:sender }, { $push: { inboxRooms: newInboxRoom.insertedId } })
            await db.collection(collectionNames.users).updateOne({ slug:reciver }, { $push: { inboxRooms: newInboxRoom.insertedId } })
            await session.commitTransaction()
            session.endSession()
            const returnResult = { ...InboxRoomDoc, _id: newInboxRoom.insertedId }
            return returnResult
        }
        await session.commitTransaction()
        session.endSession()
        return inboxRoom
    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction()
            session.endSession()
        }
        throw e
    }
}

export { chat_app_inbox_get_room }