import { ObjectId } from "mongodb";
import { VerifyToken } from "../../../grpc/account-service-client";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";

const room_remove_block = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======ROOM REMOVE BLOCK=====");
    //Get arguments
    console.log({ args });
    const { token, roomId, blockMemberSlug } = args;
    const objectRoomId = new ObjectId(roomId);
    //Check arguments
    if (!roomId.trim()) throw new Error("roomId must be provided")
    //Verify token and get slug
    const admin = await getSlugByToken(token)
    if (!blockMemberSlug.trim()) throw new Error("block member must be provided");
    if (blockMemberSlug.trim() === admin.trim()) throw new Error("cannot remove block yourself")
    //Start transcation
    const session = client.startSession();
    session.startTransaction();
    try {
        //Check roomId exist
        let RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session)

        //Check admin role
        const adminData = await db.collection(collectionNames.members).findOne({ $and: [{ slug: admin }, { roomId: objectRoomId }] })
        if (!adminData) {
            await session.abortTransaction();
            session.endSession();
            throw new Error(`${admin} is not a member of this room`);
        }
        if (adminData.role === MemberRole.member.name) {
            await session.abortTransaction();
            session.endSession();
            throw new Error(`${admin} is not a admin of this room`);
        }

        //Remove blockMemberSlug in blocklist
        const blockMemberDeleteRes = await db.collection(collectionNames.blockMembers).deleteOne({ $and: [{ slug: blockMemberSlug }, { roomId: objectRoomId }] })
        if (blockMemberDeleteRes.deletedCount === 0) {
            await session.abortTransaction();
            session.endSession();
            throw new Error(`${blockMemberSlug} is not exist in block list`);
        }
        await session.commitTransaction();
        await session.endSession();
        return {
            success: true,
            message: `${blockMemberSlug} has been remove from block list!`,
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

export { room_remove_block }