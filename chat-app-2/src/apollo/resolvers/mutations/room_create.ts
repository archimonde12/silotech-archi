import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";

const room_create = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======ROOM CREATE=====")
    //Get arguments
    console.log({ args });
    const { slug, title, startMemberSlugs, roomType } = args;
    //Start transcation
    switch (roomType) {
        case 'global':
            if (slug !== ADMIN_KEY) { throw new Error("wrong admin key!") }
            break;
        case 'public':
            console.log(startMemberSlugs.includes(slug))
            if(startMemberSlugs.includes(slug)){throw new Error("Master cannot be member!")}
            break;
        default: break;
    }
    const session = client.startSession()
    session.startTransaction()
    try {
        //Insert new room document
        const now = new Date()
        const insertRoomDoc = {
            title,
            createdBy: { slug },
            type:roomType,
            createdAt: now,
            updatedAt: now,
            totalMembers: startMemberSlugs.length+1,
            lastMess: null
        }
        console.log({ insertRoomDoc })
        const { insertedId } = await db.collection(collectionNames.rooms).insertOne(insertRoomDoc)
        console.log(insertedId)
        let insertMemberDocs = startMemberSlugs.map(slug => ({ slug, roomId: insertedId, joinedAt: now, role: MemberRole.member }))
        insertMemberDocs.push({ slug, roomId: insertedId, joinedAt: now, role: MemberRole.master })
        console.log(insertMemberDocs)
        let result = { ...insertRoomDoc, _id: insertedId }
        await session.commitTransaction()
        session.endSession()
        return { success: true, message: `create new room success!`, data: result }
    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction()
            session.endSession()
        }
        throw e
    }
}

export { room_create }