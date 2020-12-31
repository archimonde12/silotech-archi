import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
import { collectionNames, db, client } from "../../../mongo";
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const room_set_role = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("=====ROOM SET ROLE=====")

    //Get arguments
    console.log({ args })
    const { token, roomId, memberSlug, roleSet } = args;
    const roleToSet = roleSet === "admin" ? MemberRole.admin.name : MemberRole.member.name
    console.log({ roleToSet })
    const objectRoomId = new ObjectId(roomId);

    //Check arguments
    if (!roomId.trim()) throw new Error("roomId must be provided");

    //Verify token and get slug
    const master = await getSlugByToken(token)
    if (!memberSlug.trim()) throw new Error("member must be provided");
    if (master === memberSlug) throw new Error("cannot set role for your self");

    //Start transaction
    const session = client.startSession();
    session.startTransaction();
    try {

        //Check roomId exist
        let RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session)

        //Check master
        if (master !== RoomData.createdBy.slug) {
            await session.abortTransaction();
            session.endSession();
            throw new Error(`${master} is not a owner of this room`)
        }

        //Check member
        let checkOldMemFilter = { $and: [{ roomId: objectRoomId }, { slug: { $in: [master, memberSlug] } }] }
        let checkOldMembers = await db.collection(collectionNames.members).find(checkOldMemFilter, { session }).toArray()
        console.log({ checkOldMembers })
        if (checkOldMembers.length !== 2) {
            await session.abortTransaction();
            session.endSession();
            throw new Error(`${memberSlug} is not a member in this room`);
        }
        const memberData = checkOldMembers.filter(member => member.slug === memberSlug)[0]

        //Update new change
        const updateRoleRes = await db.collection(collectionNames.members).updateOne({ $and: [{ roomId: objectRoomId }, { slug: memberSlug }] }, { $set: { role: roleToSet } }, { session })
        console.log({ modifiedCount: updateRoleRes.modifiedCount })
        await session.commitTransaction();
        session.endSession();
        let listenData = {
            roomKey: roomId.toString(),
            content: `${memberSlug} became ${roleToSet}!`
        }
        pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
        return ({ ...memberData, role: roleToSet });
    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction();
            session.endSession();
        }
        throw e;
    }
}

export { room_set_role }