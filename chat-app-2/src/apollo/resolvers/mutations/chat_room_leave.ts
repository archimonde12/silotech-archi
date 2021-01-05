import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";
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
  //Verify token and get slug
  const memberSlug = await getSlugByToken(token);
  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {
    //Check roomId exist
    const RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session);
    //Check newMemberSlug exist
    const checkSlug = await db
      .collection(collectionNames.users)
      .findOne({ slug: memberSlug }, { session });
    console.log({ checkSlug });
    if (!checkSlug) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${memberSlug} not exist in user database`);
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
      session.endSession();
      throw new Error(`${memberSlug} is not a member`);
    }
    //Check master
    if (memberData.role === MemberRole.master.name) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${memberSlug} is master. Cannot leave`);
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
    await session.commitTransaction();
    session.endSession();
    const listenData = {
      roomKey: roomId.toString(),
      content: `${memberSlug} leave this room`,
    };
    pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
    return {
      success: true,
      message: `leave new room success!`,
      data: memberData,
    };
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};
export { chat_room_leave };
