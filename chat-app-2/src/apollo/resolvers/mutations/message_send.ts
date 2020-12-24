import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { MessageTypes } from "../../../models/Message";
import { client, collectionNames, db } from "../../../mongo";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const message_send = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======MESSAGE SEND=====");
  //Get arguments
  console.log({ args });
  const { sender, roomId, type, data } = args;
  const objectRoomId = new ObjectId(roomId);
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
    //Check member
    let memberData = await db
      .collection(collectionNames.members)
      .findOne({ $and: [{ roomId: objectRoomId }, { slug: sender }] });
    console.log({ memberData });
    if (!memberData) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${sender} is not a member`);
    }
    //Add new message doc
    const now = new Date();
    const insertNewMessageDoc = {
      sentAt: now,
      roomId: objectRoomId,
      type,
      data,
      createdBy: {
        slug: sender,
      },
    };
    const { insertedId } = await db
      .collection(collectionNames.messages)
      .insertOne(insertNewMessageDoc);
    console.log({ insertedId });
    //Update room doc
    if (insertedId) {
      await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $set: { updatedAt: now, lastMess: data } }
        );
    }
    await session.commitTransaction();
    session.endSession();
    pubsub.publish(LISTEN_CHANEL, { room_listen: insertNewMessageDoc });
    return {
      success: true,
      message: `send message success!`,
      data: insertNewMessageDoc,
    };
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};
export { message_send };
