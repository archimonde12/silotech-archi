import { decorateWithLogger } from "apollo-server";
import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { checkRoomIdInMongoInMutation, checkUsersInDatabase, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_block = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======ROOM BLOCK=====");

  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { roomId, blockMembersSlugs } = args;
  const objectRoomId = new ObjectId(roomId);
  const totalMemberBlock = blockMembersSlugs.length;

  //Check arguments
  if (!token || !roomId || !blockMembersSlugs)
    throw new Error("all arguments must be provided");
  if (!roomId.trim()) throw new Error("roomId must be provided");

  //Start transcation
  const session = client.startSession();
  try {
    //Verify token
    const admin = await getSlugByToken(token);
    if (blockMembersSlugs.length === 0)
      throw new Error("blockMembersSlugs must be provided");
    if (blockMembersSlugs.includes(admin))
      throw new Error("Cannot block yourself");
    let finalResult: ResultMessage = {
      success: false,
      message: '',
      data: null
    }
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session);

      //Check master in blockMembers
      if (blockMembersSlugs.includes(RoomData.createdBy.slug)) {
        await session.abortTransaction();
        finalResult.message = "Cannot block the master";
        return;
      }
      //Check room type
      if (RoomData.type === `global`) {
        await session.abortTransaction();
        finalResult.message = "This is global room!you can do anything"
        return;
      }
      //Check blockMembers exist
      let slugsInDatabase = await checkUsersInDatabase([blockMembersSlugs], session)
      if (slugsInDatabase.length !== blockMembersSlugs.length) {
        await session.abortTransaction();
        finalResult.message = `${blockMembersSlugs.filter(slug => !slugsInDatabase.includes(slug))} is not exist in database!`
        return
      }
      //Check member
      const checkOldMembersArray = [...blockMembersSlugs, admin];
      const checkOldMemFilter = {
        $and: [{ roomId: objectRoomId }, { slug: { $in: checkOldMembersArray } }],
      };
      const checkOldMembers = await db
        .collection(collectionNames.members)
        .find(checkOldMemFilter, { session })
        .toArray();
      console.log(`${checkOldMembers.length} member document(s) was/were found in the members collection`);
      if (checkOldMembers.length !== checkOldMembersArray.length) {
        await session.abortTransaction();
        finalResult.message = `admin or someone are not a member in this room`
        return
      }

      //Check admin role
      const blockMemberData = checkOldMembers.filter(
        (member) => member.slug !== admin
      );
      // console.log({ blockMemberData });
      const adminData = checkOldMembers.filter(
        (member) => member.slug === admin
      )[0];
      // console.log({ adminData });
      const isAdminInBlockMembers: boolean = !blockMemberData.every(
        (member) => member.role === MemberRole.member.name
      );
      console.log({ isAdminInBlockMembers });
      if (isAdminInBlockMembers && adminData.role !== MemberRole.master.name) {
        await session.abortTransaction();
        finalResult.message = "Someone in block list is admin, you must be a master to block him"
        return;
      }
      if (adminData.role === MemberRole.member.name) {
        await session.abortTransaction();
        finalResult.message = `${admin} is not admin.`;
        return;
      }

      //Remove member doc
      const deleteQuery = {
        $and: [{ roomId: objectRoomId }, { slug: { $in: blockMembersSlugs } }],
      };
      const { deletedCount } = await db
        .collection(collectionNames.members)
        .deleteMany(deleteQuery, { session });
      console.log(`${deletedCount} doc(s) was/were deleted in the members collection`)
      //Update room doc
      if (!deletedCount) {
        await session.abortTransaction();
        finalResult.message = "fail to delete"
        return;
      }
      const updateRoomRes=await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: -deletedCount } },
          { session }
        );
        console.log(`${updateRoomRes.modifiedCount} doc(s) was/were updated in the rooms collection`)
      //Add block member
      const insertBlockMemberDocs = blockMembersSlugs.map((slug) => ({
        slug,
        roomId: objectRoomId,
      }));
      const insertRes = await db
        .collection(collectionNames.blockMembers)
        .insertMany(insertBlockMemberDocs, { session });
      console.log(`${insertRes.insertedCount} doc(s) was/were inserted to the blockMembers collection`);
     
      const listenData = {
        roomKey: roomId.toString(),
        content: `${blockMembersSlugs} has been block`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult.success=true
      finalResult.message=`${totalMemberBlock} member(s) has been block!`
    }, transactionOptions)
    if (!transactionResults) {
      console.log("The transaction was intentionally aƒborted.");
    } else {
      console.log("The reservation was successfully created.");
    }
    session.endSession()
    return finalResult
  } catch (e) {
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected Error: ${e}`,
      data: null
    }
  }
};
export { chat_room_block };
