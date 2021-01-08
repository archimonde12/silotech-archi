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

const chat_room_leave = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======ROOM LEAVE=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { roomId } = args;
  const objectRoomId = new ObjectId(roomId);
  //Check arguments
  if (!token || !roomId) throw new Error("all arguments must be provided");
  if (!roomId.trim()) throw new Error("roomId must be provided");

  //Start transcation
  const session = client.startSession();
  try {
    //Verify token and get slug
    const memberSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      success: false,
      message: "",
      data: null,
    };
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData = await checkRoomIdInMongoInMutation(
        objectRoomId,
        session
      );
      //Check newMemberSlug exist
      const checkSlug = await db
        .collection(collectionNames.users)
        .findOne({ slug: memberSlug }, { session });
      console.log({ checkSlug });
      if (!checkSlug) {
        await session.abortTransaction();
        finalResult.message = `${memberSlug} not exist in user database`;
        return;
      }
      //Check member
      const memberData = await db
        .collection(collectionNames.members)
        .findOne(
          { $and: [{ roomId: objectRoomId }, { slug: memberSlug }] },
          { session }
        );
      console.log({ memberData });
      if (!memberData) {
        await session.abortTransaction();
        finalResult.message = `${memberSlug} is not a member`;
        return;
      }
      //Check master
      if (memberData.role === MemberRole.master.name) {
        await session.abortTransaction();
        finalResult.message = `${memberSlug} is master. Cannot leave`;
        return;
      }
      //Delete member document
      await db
        .collection(collectionNames.members)
        .deleteOne({ _id: memberData._id }, { session });
      //Update room document
      await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: -1 } },
          { session }
        );
      const listenData = {
        roomKey: roomId.toString(),
        content: `${memberSlug} leave this room`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        success: true,
        message: `leave new room success!`,
        data: memberData,
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
export { chat_room_leave };
