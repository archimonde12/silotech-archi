import { getNewestNewsRoomMessage, newest_news_room_message } from "./apollo/resolvers/mutations/chat_api_system_publish_news"
import md5 from "md5";
import { ClientSession, ObjectID } from "mongodb";
import { NEWS_ROOM, secretCombinePairKey } from "./config";
import { VerifyToken } from "./grpc/account-service-client";
import { MemberInMongo } from "./models/Member";
import { InboxRoom, NewsRoomInMongo } from "./models/Room";
import { User } from "./models/User";
import { collectionNames, db } from "./mongo";
import { existsAsync } from "./redis";
import { Log, LogType } from "./models/Log";
import { getClientIp } from "@supercharge/request-ip/dist";
import { CaptureException } from "./sentry";

export const createInboxRoomKey = (slug1: string, slug2: string): string => {
  if (slug1 > slug2) {
    let combine = [slug1, secretCombinePairKey, slug2];
    let combineString = JSON.stringify(combine);
    let combineEncoded = md5(combineString);
    console.log({ combineEncoded });
    return combineEncoded;
  }
  let combine = [slug2, secretCombinePairKey, slug1];
  let combineString = JSON.stringify(combine);
  let combineEncoded = md5(combineString);
  console.log({ combineEncoded });
  return combineEncoded;
};

export const checkRoomIdInMongoInMutation = async (
  objectRoomId: ObjectID,
  session?: ClientSession
) => {
  try {
    if (session) {
      let RoomData = await db
        .collection(collectionNames.rooms)
        .findOne({ _id: objectRoomId }, { session });
      return RoomData;
    }
    let RoomData = await db
      .collection(collectionNames.rooms)
      .findOne({ _id: objectRoomId });
    console.log({ RoomData });
    return RoomData;
  } catch (e) {
    throw e;
  }
};

export const checkUsersInDatabase = async (
  slugs: string[],
  session?: ClientSession
): Promise<string[]> => {
  try {
    console.log(`Check user = ${slugs}`)
    const totalNumberUserCheck = slugs.length
    if (slugs === []) return [];
    //Check slugs in redis
    const keys = slugs.map(slug => `chat-api.users.${slug}`)
    const checkKeysExistInRedis = await existsAsync(keys)
    console.log(`${checkKeysExistInRedis}/${totalNumberUserCheck} user(s) was/were found in Redis.`)
    if (checkKeysExistInRedis === totalNumberUserCheck) {
      return slugs
    }
    //Check slugs in mongo
    const usersInMongo: User[] = session
      ? await db
        .collection(collectionNames.users)
        .find({ slug: { $in: slugs } }, { session })
        .toArray()
      : await db
        .collection(collectionNames.users)
        .find({ slug: { $in: slugs } })
        .toArray();
    const slugsInMongo = usersInMongo.map((user) => user.slug);
    console.log(`${slugsInMongo.length}/${totalNumberUserCheck} user(s) was/were found in Mongo.`);
    return slugsInMongo;
  } catch (e) {
    throw e;
  }
};

export const getSlugByToken = async (token: String): Promise<string> => {
  try {
    if (!token || !token.trim()) throw new Error("CA:002");
    const tokenVerifyRes = await VerifyToken(token);
    if (!tokenVerifyRes) throw new Error("CA:003");
    return tokenVerifyRes.result;
  } catch (e) {
    throw e
  }

};

export const createCheckFriendQuery = (senderSlug: string, receiverSlug: string) => ({
  slug1: senderSlug > receiverSlug ? senderSlug : receiverSlug,
  slug2: senderSlug <= receiverSlug ? senderSlug : receiverSlug,
});

export const ArrayRemoveNull = (_array: any[]): any[] => {
  return _array.filter(item => item)
}

export const queryInbox = async (slug: string, limit: number) => {
  try {
    const newestNewsRoomMessage = await getNewestNewsRoomMessage()
    //Get News Room Data
    const newsRoomData: NewsRoomInMongo | null = await db.collection(collectionNames.rooms).findOne({ _id: NEWS_ROOM })
    if (!newsRoomData) { throw new Error("news room not exist. Try to create new one") }
    //Get All Public And Global And Inbox Room Of Slug
    const membersData: MemberInMongo[] = await db
      .collection(collectionNames.members)
      .aggregate([
        {
          $match: {
            slug
          }
        },
        {
          $lookup:
          {
            from: collectionNames.rooms,
            localField: 'roomId',
            foreignField: '_id',
            as: 'roomDetails'
          }
        },
      ]).toArray();
    const AllRoomIdsOfSlug = membersData.map(member => member.roomId)
    const AllRoomsDetails: InboxRoom[] = await db.collection(collectionNames.rooms).find({ $or: [{ _id: { $in: AllRoomIdsOfSlug } }, { pair: { $all: [{ slug }] } }] }).sort({ "lastMess.sentAt": -1 }).limit(limit).toArray()
    const sortFunc = (a, b) => {
      if (!a.lastMess) { return 1 }
      if (!b.lastMess) { return -1 }
      if (a.lastMess.sentAt < b.lastMess.sentAt) { return 1; }
      if (a.lastMess.sentAt > b.lastMess.sentAt) { return -1; }
      return 0;
    }
    AllRoomsDetails.sort(sortFunc)
    let AllNewestMessage = ArrayRemoveNull(AllRoomsDetails.map(room => room.lastMess))
    return [newestNewsRoomMessage, ...AllNewestMessage]
  } catch (e) {
    throw e;
  }
}

export const saveRequestLog = (_ticket: string, _args: any, _functionName: string, _clientIp: string | undefined) => {
  const _log: Log = {
    ticket: _ticket,
    args: _args,
    createdAt: new Date(),
    function: _functionName,
    type: "request",
    clientIp: _clientIp ? _clientIp : 'unknown',
    result: "received a request"
  }
  db.collection(collectionNames.logs).insertOne(_log)
}

export const saveSuccessLog = (_ticket: string, _args: any, _functionName: string, _result: string, _clientIp: string | undefined) => {
  const _log: Log = {
    ticket: _ticket,
    args: _args,
    createdAt: new Date(),
    function: _functionName,
    type: 'success',
    clientIp: _clientIp ? _clientIp : 'unknown',
    result: _result
  }
  db.collection(collectionNames.logs).insertOne(_log)
}

export const saveErrorLog = (_ticket: string, _args: any, _functionName: string, _result: string, _clientIp: string | undefined) => {
  const _log: Log = {
    ticket: _ticket,
    args: _args,
    createdAt: new Date(),
    function: _functionName,
    type: 'error',
    clientIp: _clientIp ? _clientIp : 'unknown',
    result: _result
  }
  db.collection(collectionNames.logs).insertOne(_log)
}


export const ErrorResolve = (e: Error, args: any, funcName: string) => {
  console.log(`${funcName}:`, e)
  if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
    throw new Error(e.message)
  } else {
    CaptureException(e, { args })
    throw new Error("CA:004")
  }
}