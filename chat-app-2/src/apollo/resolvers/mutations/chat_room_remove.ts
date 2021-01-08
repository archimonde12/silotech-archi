import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
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
      success: false,
      message: "",
      data: null,
    };
    if (removeMemberSlugs.includes(admin)) {
      await session.abortTransaction();
      throw new Error("Cannot remove yourself");
    }
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData = await checkRoomIdInMongoInMutation(
        objectRoomId,
        session
      );

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
      console.log({ checkOldMembers });
      if (checkOldMembers.length !== checkOldMembersArray.length) {
        await session.abortTransaction();
        finalResult.message = `admin or someone are not a member in this room`;
        return;
      }

      //Check admin role
      const removeMemberData = checkOldMembers.filter(
        (member) => member.slug !== admin
      );
      console.log({ removeMemberData });
      const adminData = checkOldMembers.filter(
        (member) => member.slug === admin
      )[0];
      console.log({ adminData });
      const isAdminInRemoveMember: boolean = !removeMemberData.every(
        (member) => member.role === MemberRole.member.name
      );
      console.log({ isAdminInRemoveMember });
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
      console.log({ deletedCount });

      //Update room doc
      if (!deletedCount) {
        await session.abortTransaction();
        finalResult.message = "Fail to delete";
        return;
      }
      await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: -deletedCount } },
          { session }
        );
      const listenData = {
        roomKey: roomId.toString(),
        content: `${removeMemberSlugs} has been kick out this room`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        success: true,
        message: `${totalMemberRemove} member(s) has been removed!`,
        data: null,
      };
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The reservation was successfully created.");
    }
    session.endSession();
    return finalResult;
  } catch (e) {
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected Error: ${e}`,
      data: null,
    };
  }
};
export { chat_room_remove };
