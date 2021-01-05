import { ObjectId } from "mongodb";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_message_delete = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======MESSAGE SEND=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { roomId, messageId } = args;
  //Check arguments
  if (!token || !messageId || !roomId)
    throw new Error("all arguments must be provided");
  const objectRoomId = new ObjectId(roomId);
  const objectMessageId = new ObjectId(messageId);
  //Verify token and get slug
  const master = await getSlugByToken(token);
  //Start transaction
  const session = client.startSession();
  session.startTransaction();
  try {
    //Check roomId exist
    const RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session);
    //Check master
    if (master !== RoomData.createdBy.slug) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${master} is not a master of this room`);
    }
    //Check message
    const MessageData = await db
      .collection(collectionNames.messages)
      .findOne({ _id: objectMessageId }, { session });
    console.log({ MessageData });
    if (!MessageData) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`MessageId not exist`);
    }
    //Delete message
    const deleteMessageRes = await db
      .collection(collectionNames.messages)
      .deleteOne({ _id: objectMessageId }, { session });
    console.log(deleteMessageRes);
    await session.commitTransaction();
    session.endSession();
    const listenData = {
      roomId,
      deleteMessageId: MessageData._id,
      content: `${MessageData._id} message has been delete!`,
    };
    pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
    return {
      success: true,
      message: `delete message success!`,
    };
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};
export { chat_message_delete };
