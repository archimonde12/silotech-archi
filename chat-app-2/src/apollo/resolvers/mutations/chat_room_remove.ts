import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { RoomInMongo } from "../../../models/Room";
import {
  client,
  collectionNames,
  db,
  transactionOptions,
} from "../../../mongo";
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_remove = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======ROOM REMOVE=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { roomId, removeMemberSlugs } = args;
  const objectRoomId = new ObjectId(roomId);
  const totalMemberRemove = removeMemberSlugs.length;

  //Check arguments
  if (!token || !roomId || !removeMemberSlugs)
    throw new Error("all arguments must be provided");
  if (!roomId.trim()) throw new Error("roomId must be provided");

  if (removeMemberSlugs.length === 0)
    throw new Error("removeMemberSlugs must be provided");

  //Start transcation
  const session = client.startSession();
  try {
    //Verify token and get slug
    const admin = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: "",
      data: null,
    };
    if (removeMemberSlugs.includes(admin)) {
      throw new Error("Cannot remove yourself");
    }
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the room collection')
        await session.abortTransaction();
        finalResult.message = `Cannot find a room with roomId=${roomId}`
        return
      }
      console.log('1 document was found in the rooms collection')
      //Check master in removeMembers
      if (removeMemberSlugs.includes(RoomData.createdBy.slug)) {
        await session.abortTransaction();
        finalResult.message = "Cannot remove the master";
        return;
      }

      //Check room type
      if (RoomData.type === `global`) {
        await session.abortTransaction();
        finalResult.message = "This is global room!you can do anything";
        return;
      }

      //Check member
      const checkOldMembersArray = [...removeMemberSlugs, admin];
      const checkOldMemFilter = {
        $and: [
          { roomId: objectRoomId },
          { slug: { $in: checkOldMembersArray } },
        ],
      };
      const checkOldMembers = await db
        .collection(collectionNames.members)
        .find(checkOldMemFilter, { session })
        .toArray();
      // console.log({ checkOldMembers });
      console.log(`${checkOldMembers.length}/${checkOldMembersArray.length} document(s) was/were found in the members collection`)
      if (checkOldMembers.length !== checkOldMembersArray.length) {
        await session.abortTransaction();
        finalResult.message = `Someone are not a member in this room`;
        return;
      }

      //Check admin role
      const removeMemberData = checkOldMembers.filter(
        (member) => member.slug !== admin
      );
      // console.log({ removeMemberData });
      const adminData = checkOldMembers.filter(
        (member) => member.slug === admin
      )[0];
      // console.log({ adminData });
      const isAdminInRemoveMember: boolean = !removeMemberData.every(
        (member) => member.role === MemberRole.member.name
      );
      // console.log({ isAdminInRemoveMember });
      if (isAdminInRemoveMember && adminData.role !== MemberRole.master.name) {
        await session.abortTransaction();
        finalResult.message =
          "Someone in remove list is admin, you must be a master to remove him";
        return;
      }
      if (adminData.role === MemberRole.member.name) {
        await session.abortTransaction();
        finalResult.message = `${admin} is not admin.`;
        return;
      }

      //Remove member doc
      const deleteQuery = {
        $and: [{ roomId: objectRoomId }, { slug: { $in: removeMemberSlugs } }],
      };
      const { deletedCount } = await db
        .collection(collectionNames.members)
        .deleteMany(deleteQuery, { session });
      console.log(`${deletedCount} document(s) was/were deleted in members collection`)
      //Update room doc
      if (deletedCount===0||!deletedCount) {
        await session.abortTransaction();
        finalResult.message = "Fail to delete";
        return;
      }
      const { modifiedCount } = await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: -deletedCount } },
          { session }
        );
      console.log(`${modifiedCount} document(s) was/were updated in rooms collection. Field change ="totalMembers"`)
      const listenData = {
        roomId: roomId.toString(),
        content: `${removeMemberSlugs} has been kick out this room`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        message: `${totalMemberRemove} member(s) has been removed!`,
        data: null,
      };
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    session.endSession();
    return finalResult;
  } catch (e) {
    await session.abortTransaction();
    console.log("The transaction was aborted due to : " + e);
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      throw new Error("CA:004")
    }
  }
};
export { chat_room_remove };
