import { client, collectionNames, db } from "../../../mongo"
import { Users,checkSlugExistInDatabase } from "../../../fakeData/user"
import { errorMessage } from "../../../config"


const chat_app_public_room_create = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======PUBLIC ROOM CREATE=====")
     //Get arguments
    console.log({ args })
    const { slug, title, member } = args
    //Check user exist in database
    const memberAndOwner = [...member, slug]
    const isEveryMemberExist=memberAndOwner.every(slug=>checkSlugExistInDatabase(slug))
    if (!isEveryMemberExist) {
        throw new Error(errorMessage.someUserNotExistInDataBase)
    }
    //Start transcation
    const session = client.startSession()
    session.startTransaction()
    try {
        //Insert new chatroom document
        const now=new Date()
        const insertDoc = {
            createdBy: { slug },
            title,
            totalMembers:memberAndOwner.length,
            blockMembers: [],
            createdAt:now,
            updateAt:now
        }
        console.log({ insertDoc })
        const { insertedId } = await db.collection(collectionNames.chatRooms).insertOne(insertDoc)
        console.log({ insertedId })
        //Update roomId to all member
        const updateDoc = await db.collection(collectionNames.users).updateMany({'slug':{$in:memberAndOwner} }, { $push: { chatRooms: insertedId } })
        console.log(updateDoc)
        let result = { ...insertDoc, _id: insertedId }
        console.log({ result })
        //End transcation
        await session.commitTransaction()
        session.endSession()
        return { success: true, message: `create new room succes!`, data:result}
    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction()
            session.endSession()
        }
        throw e
    }
}

export { chat_app_public_room_create }