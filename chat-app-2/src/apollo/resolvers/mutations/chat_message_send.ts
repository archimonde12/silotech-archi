import { getClientIp } from "@supercharge/request-ip/dist";
import { ClientSession, ObjectId } from "mongodb";
import { GLOBAL_KEY } from "../../../config";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { MemberInMongo } from "../../../models/Member";
import { Message, MessageInMongo, MessageTypes, PlainTextData } from "../../../models/Message";
import { ResultMessage } from "../../../models/ResultMessage";
import { InboxRoom, RoomInMongo } from "../../../models/Room";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import {
  checkRoomIdInMongoInMutation,
  checkUsersInDatabase,
  createCheckFriendQuery,
  createInboxRoomKey,
  getSlugByToken,
  saveLog,
} from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_message_send = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
  increaseTicketNo()
  //Start transcation
  const session = client.startSession();
  try {
    //Create request log
    saveLog(ticket, args, chat_message_send.name, "request", "received a request", clientIp)
    console.log("======MESSAGE SEND=====");
    //Get arguments
    const token = ctx.req.headers.authorization;
    const { target, message } = args;
    const { roomType, receiver } = target;
    const { type, data } = message
    //Check arguments
    if (!roomType) throw new Error("CA:021");
    if (!receiver) throw new Error("CA:022")
    if (!type) throw new Error("CA:023")
    if (!data) throw new Error("CA:024")
    if(type===MessageTypes.plaintext.name){
      if(!data.content||!data.content.trim()) throw new Error("CA:064")
    }
    //Verify token and get slug
    const sender = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: '',
      data: null
    }
    const transactionResults: any = await session.withTransaction(async () => {
      switch (roomType) {
        case "global":
          finalResult = await sendMessToGlobal(sender, type, data, session);
          return;
        case "publicRoom":
          finalResult = await sendMessToPublicRoom(
            sender,
            receiver,
            type,
            data,
            session
          );
          return;
        case "inbox":
          finalResult = await sendMessToUser(sender, receiver, type, data, session);
          return;
        default:
          finalResult.message = "receiverType must be provided"
          return
      }
    }, transactionOptions)
    //Create success logs
    saveLog(ticket, args, chat_message_send.name, "success", finalResult.message, clientIp)
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    return finalResult
  } catch (e) {
     //Create error logs
     const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveLog(ticket, args, chat_message_send.name, "error", errorResult, clientIp)
    
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.log("The transaction was aborted due to " + e);
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      captureExeption(e, { args })
      throw new Error("CA:004")
    }
  } finally {
    session.endSession()
  }
};
const sendMessToGlobal = async (
  sender: string,
  type: string,
  data: any,
  session: ClientSession
) => {
  try {
    //Add new message doc
    const now = new Date();
    const insertNewMessageDoc: Message = {
      sentAt: now,
      roomId: GLOBAL_KEY,
      type,
      data,
      createdBy: {
        slug: sender,
      },
    };
    const { insertedId, insertedCount } = await db
      .collection(collectionNames.messages)
      .insertOne(insertNewMessageDoc, { session });
    console.log(`${insertedCount} document was inserted to the messages collection. docId='${insertedId}'`);
    const dataResult: MessageInMongo = {
      ...insertNewMessageDoc,
      _id: insertedId,
    };
    //Update global room doc
    const updateGlobalRoomRes = await db
      .collection(collectionNames.rooms)
      .updateOne(
        { _id: GLOBAL_KEY },
        { $set: { updatedAt: now, lastMess: dataResult } },
        { session }
      );
    console.log(`${updateGlobalRoomRes.modifiedCount} doc was updated in the rooms collection`)
    pubsub.publish(LISTEN_CHANEL, { room_listen: insertNewMessageDoc });
    pubsub.publish("userListInbox", { updateInboxList: true });
    return {
      message: `send message success!`,
      data: dataResult,
    };
  } catch (e) {
    throw e
  }
};
const sendMessToPublicRoom = async (
  sender: string,
  receiver: string,
  type: string,
  data: any,
  session: ClientSession
) => {
  try {
    //Public Room  Message
    //console.log({ receiver });
    if (ObjectId.isValid(receiver) && receiver && receiver.trim()) {
      const objectRoomId = new ObjectId(receiver);
      //Check roomId exist
      const roomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!roomData) {
        console.log("0 room was found in rooms collection");
        throw new Error("CA:025")
      }
      console.log(`1 room (title='${roomData.title}',master='${roomData.createdBy.slug}') was found in rooms collection`);
      //Check member
      const memberData: MemberInMongo | null = await db
        .collection(collectionNames.members)
        .findOne(
          { $and: [{ roomId: objectRoomId }, { slug: sender }] },
          { session }
        );
      //console.log({ memberData });
      if (!memberData) {
        console.log("0 member was found in members collection");
        throw new Error("CA:026")
      }
      console.log(`1 member document (slug='${memberData.slug}') was found in members collection`)
      //Add new message doc
      const now = new Date();
      const insertNewMessageDoc: Message = {
        sentAt: now,
        roomId: receiver,
        type,
        data,
        createdBy: {
          slug: sender,
        },
      };
      const { insertedId } = await db
        .collection(collectionNames.messages)
        .insertOne(insertNewMessageDoc, { session });
      console.log(`1 new message document was inserted in messages collection`);
      const dataResult: MessageInMongo = {
        ...insertNewMessageDoc,
        _id: insertedId
      };
      //Update room doc
      await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $set: { updatedAt: now, lastMess: dataResult } },
          { session }
        );
      console.log(`1 document was updated in rooms collection relate to new message updated`);
      pubsub.publish(LISTEN_CHANEL, { room_listen: insertNewMessageDoc });
      pubsub.publish("userListInbox", { updateInboxList: true });
      return {
        message: `send message success!`,
        data: dataResult,
      };
    }
    throw new Error("CA:027")
  } catch (e) {
    throw e
  }
};
const sendMessToUser = async (
  sender: string,
  receiver: string,
  type: string,
  data: any,
  session: ClientSession
) => {
  try {
    //Inbox Message
    console.log( sender,receiver)
    const roomKey = createInboxRoomKey(sender, receiver);

    //Check receiver exist in database
    let slugsInDatabase = await checkUsersInDatabase([receiver], session)
    if (slugsInDatabase.length !== 1) throw new Error("CA:028")
    //Check friend
    const checkFriendQuery = createCheckFriendQuery(sender, receiver)
    const checkFriend = await db
      .collection(collectionNames.friends)
      .findOne(checkFriendQuery, { session });
    if (!checkFriend || !checkFriend.isFriend) {
      console.log(`0 document was found in friends collection`)
      throw new Error("CA:029")
    }
    console.log(`1 document was found in friends collection`)
    if (checkFriend.isBlock) throw new Error("CA:030")
    //Add new message doc
    const now = new Date();
    const insertNewMessageDoc: Message = {
      sentAt: now,
      roomId: roomKey,
      type,
      data,
      createdBy: {
        slug: sender,
      },
    };
    const { insertedId } = await db
      .collection(collectionNames.messages)
      .insertOne(insertNewMessageDoc, { session });
    console.log(`1 new message document was inserted in messages collection`);
    const dataResult: MessageInMongo = {
      ...insertNewMessageDoc,
      _id: insertedId,
    };

    //Create new inbox room if this is the first message
    const inboxRoomUpdateRes = await db
      .collection(collectionNames.rooms)
      .updateOne({ _id: roomKey }, { $set: { lastMess: dataResult } }, { session });
    console.log(`${inboxRoomUpdateRes.modifiedCount} document was updated in rooms collection relate to new message updated`);
    if (inboxRoomUpdateRes.modifiedCount === 0) {
      const insertNewInboxRoomDoc: InboxRoom = {
        _id: roomKey,
        pair: [{ slug: sender }, { slug: receiver }],
        type: 'inbox',
        createdAt: now,
        updatedAt: now,
        lastMess: dataResult,
      };
      await db
        .collection(collectionNames.rooms)
        .insertOne(insertNewInboxRoomDoc, { session });
      console.log(`1 new inboxRoom document was inserted in rooms collection`);
    }
    pubsub.publish(LISTEN_CHANEL, { inbox_room_listen: insertNewMessageDoc });
    pubsub.publish("userListInbox", { updateInboxList: true });
    return {
      message: `send message success!`,
      data: dataResult,
    };
  } catch (e) {
    throw e
  }
};
export { chat_message_send };
