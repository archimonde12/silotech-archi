import { ClientSession, ObjectId } from "mongodb";
import { GLOBAL_KEY } from "../../../config";
import { InboxRoom } from "../../../models/InboxRoom";
import { Message, MessageInMongo } from "../../../models/Message";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation, createInboxRoomKey, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const message_send = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======MESSAGE SEND=====");
  //Get arguments
  const token = ctx.req.headers.authorization
  const { sendTo, type, data } = args;
  const { roomType, reciver } = sendTo
  if (!token || !roomType || !type || !data) throw new Error("all arguments must be provided")
  //Check arguments
  if (!token.trim()) {
    throw new Error("token must be provided")
  }
  //Verify token and get slug
  const sender = await getSlugByToken(token)
  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  let result: any
  try {
    switch (roomType) {
      case 'global':
        result = await sendMessToGlobal(sender, type, data, session)
        if (!result) {
          await session.abortTransaction();
          session.endSession();
          throw new Error(`send message to user fail!`);
        }
        return result
      case 'publicRoom':
        result = await sendMessToPublicRoom(sender, reciver, type, data, session)
        if (!result) {
          await session.abortTransaction();
          session.endSession();
          throw new Error(`send message to publicRoom fail!`);
        }
        return result
      case 'inbox':
        result = await sendMessToUser(sender, reciver, type, data, session)
        if (!result) {
          await session.abortTransaction();
          session.endSession();
          throw new Error(`send message to user fail!`);
        }
        return result
      default: throw new Error('reciverType must be provided')
    }
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};
const sendMessToGlobal = async (sender: string, type: string, data: any, session: ClientSession) => {
  try {
    //Add new message doc
    const now = new Date();
    const insertNewMessageDoc: Message = {
      sentAt: now,
      roomKey: GLOBAL_KEY,
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
    const dataResult: MessageInMongo = { ...insertNewMessageDoc, _id: insertedId }
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
    throw e
  }
}
const sendMessToPublicRoom = async (sender: string, reciver: string, type: string, data: any, session: ClientSession) => {
  try {
    //Public Room  Message 
    console.log({ reciver })
    if (ObjectId.isValid(reciver) && reciver && reciver.trim()) {
      const objectRoomId = new ObjectId(reciver);
      //Check roomId exist
      await checkRoomIdInMongoInMutation(objectRoomId, session)
      //Check member
      const memberData = await db
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
      const dataResult: MessageInMongo = { ...insertNewMessageDoc, _id: insertedId }
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
    await session.abortTransaction();
    session.endSession();
    throw new Error("roomID invalid");
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e
  }
}
const sendMessToUser = async (sender: string, reciver: string, type: string, data: any, session: ClientSession) => {
  try {
    if (!reciver || !reciver.trim()) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("reciver username must be provided");
    }
    //Inbox Message 
    const roomKey = await createInboxRoomKey(sender, reciver)
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
    //Check friend 
    const checkFriendQuery = {
      slug1: sender > reciver ? sender : reciver,
      slug2: sender <= reciver ? sender : reciver
    }
    const checkFriend = await db.collection(collectionNames.friends).findOne(checkFriendQuery, { session })
    if (!checkFriend || !checkFriend.isFriend) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("must be friend before start a conversation!");
    }
    if (checkFriend.isBlock) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("This conversation has been blocked");
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
    pubsub.publish(LISTEN_CHANEL, { room_listen: insertNewMessageDoc });
    const dataResult: MessageInMongo = { ...insertNewMessageDoc, _id: insertedId }

    //Create new inbox room if this is the first message
    const inboxRoomUpdateRes = await db.collection(collectionNames.inboxRooms).updateOne({ roomKey }, { $set: { lastMess: dataResult } }, { session })
    console.log({ modifiedCount: inboxRoomUpdateRes.modifiedCount })
    if (inboxRoomUpdateRes.modifiedCount === 0) {
      const insertNewInboxRoomDoc: InboxRoom = {
        roomKey,
        pair: [{ slug: sender }, { slug: reciver }],
        lastMess: dataResult,
      }
      await db.collection(collectionNames.inboxRooms).insertOne(insertNewInboxRoomDoc, { session })
    }
    await session.commitTransaction();
    session.endSession();
    pubsub.publish(LISTEN_CHANEL, { inbox_room_listen: insertNewMessageDoc });

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
    throw e
  }
}
export { message_send };
