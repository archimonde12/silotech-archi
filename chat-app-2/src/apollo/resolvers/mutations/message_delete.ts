import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { MessageTypes } from "../../../models/Message";
import { client, collectionNames, db } from "../../../mongo";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const message_delete = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======MESSAGE SEND=====");
  //Get arguments
  console.log({ args });
  const { master, roomId, messageId } = args;
  const objectRoomId = new ObjectId(roomId);
  const objectMessageId = new ObjectId(messageId);
  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {
    //Check roomId exist
    let RoomData = await db
      .collection(collectionNames.rooms)
      .findOne({ _id: objectRoomId });
    console.log({ RoomData });
    if (!RoomData) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("RoomId not exist");
    }
    //Check master
    if (master !== RoomData.createdBy.slug) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${master} is not a master of this room`);
    }
    //Check message
    let MessageData = await db
      .collection(collectionNames.messages)
      .findOne({ _id: objectMessageId });
    console.log({ MessageData });
    if (!MessageData) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`MessageId not exist`);
    }
    //Delete message
    const deleteMessageRes = await db
      .collection(collectionNames.messages)
      .deleteOne({ _id: objectMessageId });
    console.log(deleteMessageRes);
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};
export { message_delete };
