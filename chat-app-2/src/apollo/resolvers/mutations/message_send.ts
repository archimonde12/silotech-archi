import { ObjectId } from "mongodb";
import { InboxRoom } from "../../../models/InboxRoom";
import { Message, MessageInMongo } from "../../../models/Message";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation, createInboxRoomKey } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";
import {clientMain} from "../../../grpc/account-service-client"
import {decode} from "jsonwebtoken"

const message_send = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======MESSAGE SEND=====");
  //Get arguments
  console.log({ args });
  const { sender, reciver, type, data } = args;
  //Check arguments
  if (!sender.trim() || !reciver.trim()) {
    throw new Error("sender or reciver is empty")
  }
  //await clientMain()
  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  //let decoded=decode("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbHVnIjoiaG9hbjAwMSIsInR5cGUiOiJzbHVnIiwiZXhwIjoxNjEwNDQ1NzYxLCJpYXQiOjE2MDkxNDk3NjF9.leQK5fCB8_0zw8IL8v7pJQPY9mTvPX4uXX3Mj4FDE2U")
  //console.log({decoded})
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
    //Inbox Message handler
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
    if(!checkFriend||!checkFriend.isFriend){
      await session.abortTransaction();
      session.endSession();
      throw new Error("must be a friend before start a conversation!");
    }
    if(checkFriend.isBlock){
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
