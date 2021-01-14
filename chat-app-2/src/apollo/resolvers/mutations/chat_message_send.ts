import { ClientSession, ObjectId } from "mongodb";
import { GLOBAL_KEY } from "../../../config";
import { MemberInMongo } from "../../../models/Member";
import { Message, MessageInMongo } from "../../../models/Message";
import { ResultMessage } from "../../../models/ResultMessage";
import { InboxRoom, RoomInMongo } from "../../../models/Room";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import {
  checkRoomIdInMongoInMutation,
  checkUsersInDatabase,
  createCheckFriendQuery,
  createInboxRoomKey,
  getSlugByToken,
} from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_message_send = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======MESSAGE SEND=====");
  //Get arguments
  const token = ctx.req.headers.authorization;
  const { sendTo, type, data } = args;
  const { roomType, receiver } = sendTo;
  //Check arguments
  if (!roomType || !type || !data)
    throw new Error("all arguments must be provided");

  //Start transcation
  const session = client.startSession();
  try {
    //Verify token and get slug
    const sender = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      success: false,
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
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    session.endSession()
    return finalResult
  } catch (e) {
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected Error: ${e}`,
      data
    }
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
      success: true,
      message: `send message success!`,
      data: dataResult,
    };
  } catch (e) {
    await session.abortTransaction();
    return {
      success: false,
      message: `Unexpected err: ${e}`,
      data: null,
    }
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
        await session.abortTransaction()
        return {
          success: false,
          message: `publicRoom not exist`,
          data: null
        }
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
        await session.abortTransaction();
        return {
          success: false,
          message: `${sender} is not a member of this room`,
          data: null
        }
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
        success: true,
        message: `send message success!`,
        data: dataResult,
      };
    }
    await session.abortTransaction();
    return {
      success: false,
      message: `roomId invalid`,
      data: null,
    }
  } catch (e) {
    await session.abortTransaction();
    return {
      success: false,
      message: `Unexpected err: ${e}`,
      data: null,
    }
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
    console.log({ receiver })
    if (!receiver || !receiver.trim()) {
      console.log(`arguments invalid`)
      await session.abortTransaction();
      return {
        success: false,
        message: `receiver username must be provided`,
        data: null
      }
    }
    //Inbox Message
    const roomKey = createInboxRoomKey(sender, receiver);

    //Check receiver exist in database
    let slugsInDatabase = await checkUsersInDatabase([receiver], session)
    if (slugsInDatabase.length !== 1) {
      await session.abortTransaction();
      return {
        success: false,
        message: `${receiver} is not exist in database!`,
        data: null
      }
    }
    //Check friend
    const checkFriendQuery = createCheckFriendQuery(sender, receiver)
    const checkFriend = await db
      .collection(collectionNames.friends)
      .findOne(checkFriendQuery, { session });
    if (!checkFriend || !checkFriend.isFriend) {
      console.log(`0 document was found in friends collection`)
      await session.abortTransaction();
      return {
        success: false,
        message: `${sender} and ${receiver} must be friend before start a conversation!`,
        data: null
      }
    }
    console.log(`1 document was found in friends collection`)
    if (checkFriend.isBlock) {
      await session.abortTransaction();
      return {
        success: false,
        message: `This conversation has been blocked`,
        data: null
      }
    }
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
      success: true,
      message: `send message success!`,
      data: dataResult,
    };
  } catch (e) {
    await session.abortTransaction();
    return {
      success: false,
      message: `Unexpected err: ${e}`,
      data: null,
    }
  }
};
export { chat_message_send };
