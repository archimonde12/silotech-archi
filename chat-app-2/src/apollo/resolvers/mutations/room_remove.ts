import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const room_remove = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======ROOM REMOVE=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization
    const { roomId, removeMemberSlugs } = args;
    const objectRoomId = new ObjectId(roomId);
    const totalMemberRemove = removeMemberSlugs.length

    //Check arguments
    if(!token||!roomId||!removeMemberSlugs) throw new Error("all arguments must be provided")
    if (!roomId.trim()) throw new Error("roomId must be provided")
    //Verify token and get slug
    const admin = await getSlugByToken(token)
    if (removeMemberSlugs.length === 0) throw new Error("removeMemberSlugs must be provided")
    if (removeMemberSlugs.includes(admin)) throw new Error("Cannot remove yourself");

    //Start transcation
    const session = client.startSession();
    session.startTransaction();
    try {

        //Check roomId exist
        const RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session)

        //Check master in removeMembers
        if (removeMemberSlugs.includes(RoomData.createdBy.slug)) throw new Error("Cannot remove the master")

        //Check room type
        if (RoomData.type === `global`) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("This is global room!you can do anything");
        }

        //Check member
        const checkOldMembersArray = [...removeMemberSlugs, admin]
        const checkOldMemFilter = { $and: [{ roomId: objectRoomId }, { slug: { $in: checkOldMembersArray } }] }
        const checkOldMembers = await db.collection(collectionNames.members).find(checkOldMemFilter, { session }).toArray()
        console.log({ checkOldMembers })
        if (checkOldMembers.length !== checkOldMembersArray.length) {
            await session.abortTransaction();
            session.endSession();
            throw new Error(`admin or someone are not a member in this room`);
        }

        //Check admin role
        const removeMemberData = checkOldMembers.filter(member => member.slug !== admin)
        console.log({ removeMemberData })
        const adminData = checkOldMembers.filter(member => member.slug === admin)[0]
        console.log({ adminData })
        const isAdminInRemoveMember: boolean = !removeMemberData.every(member => member.role === MemberRole.member.name)
        console.log({ isAdminInRemoveMember })
        if (isAdminInRemoveMember && adminData.role !== MemberRole.master.name) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Someone in remove list is admin, you must be a master to remove him")
        }
        if (adminData.role === MemberRole.member.name) {
            await session.abortTransaction();
            session.endSession();
            throw new Error(`${admin} is not admin.`)
        }

        //Remove member doc
        const deleteQuery = { $and: [{ roomId: objectRoomId }, { slug: { $in: removeMemberSlugs } }] }
        const { deletedCount } = await db.collection(collectionNames.members).deleteMany(deleteQuery, { session })
        console.log({ deletedCount })

        //Update room doc
        if (!deletedCount) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Fail to delete")
        }
        await db.collection(collectionNames.rooms).updateOne({ _id: objectRoomId }, { $inc: { totalMembers: -deletedCount } }, { session })
        await session.commitTransaction();
        session.endSession();
        const listenData = {
            roomKey: roomId.toString(),
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