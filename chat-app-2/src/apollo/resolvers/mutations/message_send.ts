import { ObjectId } from "mongodb";
import { Message, MessageInMongo} from "../../../models/Message";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation, createInboxRoomKey } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const message_send = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======MESSAGE SEND=====");
  //Get arguments
  console.log({ args });
  const { sender, reciver, type, data } = args;
  //Check arguments
  if (!sender.trim() || !reciver.trim()) {
    throw new Error("sender or reciver is empty")
  }
  //Start transcation
  const session = client.startSession();
  session.startTransaction();

  try {
    //Public Message handler
    if (ObjectId.isValid(reciver)) {
      const objectRoomId = new ObjectId(reciver);

      //Check roomId exist
      await checkRoomIdInMongoInMutation(objectRoomId, session)
      //Check member
      let memberData = await db
        .collection(collectionNames.members)
        .findOne({ $and: [{ roomId: objectRoomId }, { slug: sender }] }, { session });
      console.log({ memberData });
      if (!memberData) {
        await session.abortTransaction();
        session.endSession();
        throw new Error(`${sender} is not a member`);
      }
      //Add new message doc
      const now = new Date();
      const insertNewMessageDoc: Message = {
        sentAt: now,
        roomKey: reciver,
        type,
        data,
        createdBy: {
          slug: sender,
        },
      };
      const { insertedId } = await db
        .collection(collectionNames.messages)
        .insertOne(insertNewMessageDoc, { session });
      console.log({ insertedId });
      const dataResult:MessageInMongo={...insertNewMessageDoc,_id:insertedId}
      //Update room doc
      if (insertedId) {
        await db
          .collection(collectionNames.rooms)
          .updateOne(
            { _id: objectRoomId },
            { $set: { updatedAt: now, lastMess: data } }, { session }
          );
      }
      await session.commitTransaction();
      session.endSession();
      pubsub.publish(LISTEN_CHANEL, { room_listen: insertNewMessageDoc });
      return {
        success: true,
        message: `send message success!`,
        data: dataResult,
      };
    }
    //Inbox Message handler
    const roomKey =await createInboxRoomKey(sender, reciver)
    const checkSlugs = [sender, reciver]
    //Check sender and reciver exist in database
    const findUsersRes = await db
      .collection(collectionNames.users)
      .find({ slug: { $in: checkSlugs } })
      .toArray();
    if (findUsersRes.length !== 2) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("someone not exist in database!");
    }
      //Add new message doc
      const now = new Date();
      const insertNewMessageDoc: Message = {
        sentAt: now,
        roomKey,
        type,
        data,
        createdBy: {
          slug: sender,
        },
      };
      const { insertedId } = await db
        .collection(collectionNames.messages)
        .insertOne(insertNewMessageDoc, { session });
      console.log({ insertedId });
      const dataResult:MessageInMongo={...insertNewMessageDoc,_id:insertedId}
      await session.commitTransaction();
      session.endSession();
      pubsub.publish(LISTEN_CHANEL, { room_listen: insertNewMessageDoc });
      return {
        success: true,
        message: `send message success!`,
        data: dataResult,
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
