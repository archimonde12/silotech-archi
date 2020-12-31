import { ObjectId } from "mongodb";
import { Member, MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const room_add = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM ADD=====");
  //Get arguments
  console.log({ args });
  const { token, roomId, addMemberSlugs } = args;
  const objectRoomId = new ObjectId(roomId);
  const totalAddMember = addMemberSlugs.length;
  //Check arguments
  if (!roomId.trim()) throw new Error("roomId must be provided")
  if (addMemberSlugs.length===0) throw new Error("add Member must be provided")
  //Verify token and get slug
  let admin =await getSlugByToken(token)
  if (addMemberSlugs.length === 0) throw new Error("addMemberSlugs must be provided")
  if (addMemberSlugs.includes(admin)) throw new Error("Cannot add yourself");

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
      throw new Error("Cannot add! Because this room is inboxRoom ");
    }
    if (RoomData.type === `global`) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("This is global room!you can do anything");
    }

    //Check addMemberSlugs exist
    let checkSlug = await db
      .collection(collectionNames.users)
      .find({ slug: { $in: addMemberSlugs } }, { session })
      .toArray();
    console.log({ checkSlug });
    if (checkSlug.length !== totalAddMember) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(
        `${totalAddMember - checkSlug.length
        } member(s) not exist in user database`
      );
    }

    //Check member
    const checkOldMembersArray = [...addMemberSlugs, admin]
    let checkOldMembers = await db
      .collection(collectionNames.members)
      .find({
        $and: [{ roomId: objectRoomId }, { slug: { $in: checkOldMembersArray } }],
      }, { session })
      .toArray();
    console.log({ checkOldMembers });
    if (checkOldMembers.length > 1) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`Someone has already been a member`);
    }
    //Check block
    let checkBlockMembers = await db
      .collection(collectionNames.blockMembers)
      .find({
        $and: [{ roomId: objectRoomId }, { slug: { $in: checkOldMembersArray } }],
      }, { session })
      .toArray();
    console.log({ checkBlockMembers })
    if (checkBlockMembers.length > 0) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`Someone has already been block`);
    }
    //Check admin role
    if (!checkOldMembers[0] || checkOldMembers[0].role === MemberRole.member.name) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${admin} is not a admin of this room`);
    }
    //Create new member doc
    const now = new Date();
    let insertMemberDocs: Member[] = addMemberSlugs.map((memberSlug) => ({
      slug: memberSlug,
      roomId: objectRoomId,
      joinedAt: now,
      role: MemberRole.member.name,
    }));
    let insertRes = await db
      .collection(collectionNames.members)
      .insertMany(insertMemberDocs, { session });
    console.log(insertRes);
    //Update room doc
    await db
      .collection(collectionNames.rooms)
      .updateOne(
        { _id: objectRoomId },
        { $inc: { totalMembers: totalAddMember } }, { session }
      );
    await session.commitTransaction();
    session.endSession();
    const listenData = {
      roomKey: roomId.toString(),
      content: `${addMemberSlugs} has been added`
    }
    pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
    return {
      success: true,
      message: `add ${totalAddMember} new member(s) success!`,
      data: null,
    };
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};
export { room_add };
