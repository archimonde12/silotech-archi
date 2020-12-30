import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const room_leave = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM LEAVE=====");
  //Get arguments
  console.log({ args });
  const { memberSlug, roomId } = args;
  const objectRoomId = new ObjectId(roomId);
  //Check arguments
  if (!memberSlug.trim()) throw new Error("memberSlug must be provided")

  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {
    //Check roomId exist
    let RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session)
    //Check newMemberSlug exist
    let checkSlug = await db
      .collection(collectionNames.users)
      .findOne({ slug: memberSlug }, { session });
    console.log({ checkSlug });
    if (!checkSlug) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${memberSlug} not exist in user database`);
    }
    //Check room type
    if (RoomData.type === `inbox`) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Cannot leave! Because this room is inboxRoom ");
    }
    //Check member
    let memberData = await db
      .collection(collectionNames.members)
      .findOne({ $and: [{ roomId: objectRoomId }, { slug: memberSlug }] }, { session });
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
      .updateOne({ _id: objectRoomId }, { $inc: { totalMembers: -1 } }, { session });
    await session.commitTransaction();
    session.endSession();
    const listenData = {
      roomKey: roomId.toString(),
      content: `${memberSlug} leave this room`
    }
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
export { room_leave };
