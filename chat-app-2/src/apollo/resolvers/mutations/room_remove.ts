import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const room_remove = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======ROOM REMOVE=====");
    //Get arguments
    console.log({ args });
    const { master, roomId, removeMemberSlugs } = args;
    const objectRoomId = new ObjectId(roomId);
    const totalMemberRemove = removeMemberSlugs.length
    //Check arguments
    if (!master.trim()) {
        throw new Error("master must be provided")
    }
    //Check master in remove list
    if (removeMemberSlugs.includes(master)) {
        throw new Error("Cannot remove the master")
    }
    //Start transcation
    const session = client.startSession();
    session.startTransaction();
    try {
        //Check roomId exist
        let RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session)
        //Check room type
        if (RoomData.type === `inbox`) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Cannot remove! Because this room is inboxRoom ");
        }
        if (RoomData.type === `global` && master !== ADMIN_KEY) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("wrong admin key!");
        }
        //Check master 
        if (master !== RoomData.createdBy.slug) {
            await session.abortTransaction();
            session.endSession();
            throw new Error(`${master} is not a master of this room`);
        }
        //Check member
        let checkOldMemFilter = { $and: [{ roomId: objectRoomId }, { slug: { $in: removeMemberSlugs } }] }
        let checkOldMembers = await db.collection(collectionNames.members).find(checkOldMemFilter, { session }).toArray()
        console.log({ checkOldMembers })
        if (checkOldMembers.length !== totalMemberRemove) {
            await session.abortTransaction();
            session.endSession();
            throw new Error(`${totalMemberRemove - checkOldMembers.length} user(s) are not a member in this room`);
        }
        //Remove member doc
        let { deletedCount } = await db.collection(collectionNames.members).deleteMany(checkOldMemFilter, { session })
        console.log({ deletedCount })
        //Update room doc
        if (!deletedCount) { throw new Error("fail to delete") }
        await db.collection(collectionNames.rooms).updateOne({ _id: objectRoomId }, { $inc: { totalMembers: -deletedCount } }, { session })
        await session.commitTransaction();
        session.endSession();
        const listenData = {
            roomId,
            content: `${removeMemberSlugs} has been kick out this room`
        }
        pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
        return {
            success: true,
            message: `${totalMemberRemove} member(s) has been removed!`,
            data: null,
        };
    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction();
            session.endSession();
        }
        throw e;
    }
}
export { room_remove }