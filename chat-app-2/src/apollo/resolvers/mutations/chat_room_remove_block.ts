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

const chat_room_remove_block = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======ROOM REMOVE BLOCK=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { roomId, blockMemberSlug } = args;
  const objectRoomId = new ObjectId(roomId);
  //Check arguments
  if (!token || !roomId || !blockMemberSlug)
    throw new Error("all arguments must be provided");
  if (!roomId.trim()) throw new Error("roomId must be provided");
  if (!blockMemberSlug.trim()) {
    throw new Error("block member must be provided");
  }
  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {
    //Verify token and get slug
    const admin = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      success: false,
      message: "",
      data: null,
    };
    if (blockMemberSlug.trim() === admin.trim()) {
      await session.abortTransaction();
      throw new Error("cannot remove block yourself");
    }

    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData = await checkRoomIdInMongoInMutation(
        objectRoomId,
        session
      );
      //Check admin role
      const adminData = await db
        .collection(collectionNames.members)
        .findOne({ $and: [{ slug: admin }, { roomId: objectRoomId }] });
      if (!adminData) {
        await session.abortTransaction();
        finalResult.message = `${admin} is not a member of this room`;
        return;
      }
      if (adminData.role === MemberRole.member.name) {
        await session.abortTransaction();
        finalResult.message = `${admin} is not a admin of this room`;
        return;
      }

      //Remove blockMemberSlug in blocklist
      const blockMemberDeleteRes = await db
        .collection(collectionNames.blockMembers)
        .deleteOne({
          $and: [{ slug: blockMemberSlug }, { roomId: objectRoomId }],
        });
      if (blockMemberDeleteRes.deletedCount === 0) {
        await session.abortTransaction();
        finalResult.message = `${blockMemberSlug} is not exist in block list`;
        return;
      }
      finalResult = {
        success: true,
        message: `${blockMemberSlug} has been remove from block list!`,
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

export { chat_room_remove_block };
