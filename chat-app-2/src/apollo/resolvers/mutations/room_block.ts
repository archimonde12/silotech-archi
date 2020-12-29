import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const room_block = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM BLOCK=====");

  //Get arguments
  console.log({ args });
  const { admin, roomId, blockMembersSlugs } = args;
  const objectRoomId = new ObjectId(roomId);
  const totalMemberBlock = blockMembersSlugs.length;

  //Check arguments
  if (!admin.trim()) throw new Error("admin must be provided")
  if (blockMembersSlugs.length===0) throw new Error("blockMembersSlugs must be provided")
  if (blockMembersSlugs.includes(admin)) throw new Error("Cannot block yourself");

  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {

    //Check roomId exist
    let RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session)

    //Check master in blockMembers
    if (blockMembersSlugs.includes(RoomData.createdBy.slug)) throw new Error("Cannot block the master")

    //Check room type
    if (RoomData.type === `global`) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("This is global room!you can do anything");
    }

    //Check member
    const checkOldMembersArray = [...blockMembersSlugs, admin]
    let checkOldMemFilter = { $and: [{ roomId: objectRoomId }, { slug: { $in: checkOldMembersArray } }] }
    let checkOldMembers = await db.collection(collectionNames.members).find(checkOldMemFilter, { session }).toArray()
    console.log({ checkOldMembers })
    if (checkOldMembers.length !== checkOldMembersArray.length) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`admin or someone are not a member in this room`);
    }

    //Check admin role
    let blockMemberData = checkOldMembers.filter(member => member.slug !== admin)
    console.log({ blockMemberData })
    let adminData = checkOldMembers.filter(member => member.slug === admin)[0]
    console.log({ adminData })
    let isAdminInBlockMembers: boolean = !blockMemberData.every(member => member.role === MemberRole.member.name)
    console.log({ isAdminInBlockMembers })
    if (isAdminInBlockMembers && adminData.role !== MemberRole.master.name) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Someone in block list is admin, you must be a master to block him")
    }
    if (adminData.role === MemberRole.member.name) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${admin} is not admin.`)
    }

    //Remove member doc
    let deleteQuery = { $and: [{ roomId: objectRoomId }, { slug: { $in: blockMembersSlugs } }] }
    let { deletedCount } = await db
      .collection(collectionNames.members)
      .deleteMany(deleteQuery, { session });
    console.log({ deletedCount });
    
    //Update room doc
    if (!deletedCount) {
      throw new Error("fail to delete");
    }
    await db
      .collection(collectionNames.rooms)
      .updateOne(
        { _id: objectRoomId },
        { $inc: { totalMembers: -deletedCount } },
        { session }
      );
    //Add block member
    const insertBlockMemberDocs = blockMembersSlugs.map((slug) => ({
      slug,
      roomId: objectRoomId,
    }));
    let insertRes = await db
      .collection(collectionNames.blockMembers)
      .insertMany(insertBlockMemberDocs, { session });
    console.log(`${insertRes.insertedCount} docs has been added!`);
    await session.commitTransaction();
    session.endSession();
    const listenData = {
      roomKey: roomId.toString(),
      content: `${blockMembersSlugs} has been block to join room`
    }
    pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
    return {
      success: true,
      message: `${totalMemberBlock} member(s) has been block!`,
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
export { room_block };
