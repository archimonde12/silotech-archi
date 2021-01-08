import { ObjectId } from "mongodb";
import { GLOBAL_KEY } from "../../../config";
import { collectionNames, db } from "../../../mongo";
import { createInboxRoomKey, getSlugByToken } from "../../../ulti";

const chat_get_messages_in_room = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======GET MESSAGES=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization
  const { room, limit = 10, skip = 0 } = args;
  const { roomType, reciver } = room
  if (!token.trim()) {
    throw new Error("token must provided in this situation")
  }
  //Verify token and get slug
  const sender = await getSlugByToken(token)
  let result: any
  //Check arguments
  if (!token || !room) throw new Error("all arguments must be provided")
  try {
    switch (roomType) {
      case 'global':
        result = await getMessInGlobal(limit, skip)
        if (!result) throw new Error(`get message in global fail!`);
        return result
      case 'publicRoom':
        result = await getMessInPublicRoom(reciver, limit, skip)
        if (!result) throw new Error(`get message in publicRoom fail!`);
        return result
      case 'inbox':
        result = await getMessInInboxRoom(sender, reciver, limit, skip)
        if (!result) throw new Error(`get message in inbox fail!`);
        return result
      default: throw new Error('roomType must be provided')
    }
  } catch (e) {
    throw e;
  }
};
export { chat_get_messages_in_room };

const getMessInPublicRoom = async (reciver: string, limit: number, skip: number) => {
  //reciver is a room
  if (ObjectId.isValid(reciver)&& reciver && reciver.trim()) {
    const objectRoomId = new ObjectId(reciver);
    //Check roomId exist
    const RoomData = await db
      .collection(collectionNames.rooms)
      .findOne({ _id: objectRoomId });
    console.log({ RoomData });
    if (!RoomData) {
      throw new Error("RoomId not exist");
    }
    //Query Message
    const allMessage = await db
      .collection(collectionNames.messages)
      .find({ roomId: reciver })
      .limit(limit)
      .skip(skip)
      .sort({ sentAt: -1 })
      .toArray();
    console.log({ allMessage })
    allMessage.sort((a, b) => a.sentAt - b.sentAt);
    return allMessage;
  }
  throw new Error("roomID invalid");
}
const getMessInInboxRoom = async (sender: string, reciver: string, limit: number, skip: number) => {
  if(!reciver||!reciver.trim()) throw new Error('reciver username must be provided')
  if(sender===reciver) throw new Error('cannot send to message to yourself')
  const roomKey = await createInboxRoomKey(sender, reciver)
  const checkSlugs = [sender, reciver]
  //Check sender and reciver exist in database
  const findUsersRes = await db
    .collection(collectionNames.users)
    .find({ slug: { $in: checkSlugs } })
    .toArray();
  console.log({ findUsersRes })
  if (findUsersRes.length !== 2) {
    throw new Error("someone not exist in database!");
  }
  //Query Message
  const allMessage = await db
    .collection(collectionNames.messages)
    .find({ roomId:roomKey })
    .limit(limit)
    .skip(skip)
    .sort({ sentAt: -1 })
    .toArray();
  allMessage.sort((a, b) => a.sentAt - b.sentAt);
  return allMessage;
}
const getMessInGlobal = async (limit: number, skip: number) => {
  //Query Message
  const allMessage = await db
    .collection(collectionNames.messages)
    .find({ roomId: GLOBAL_KEY })
    .limit(limit)
    .skip(skip)
    .sort({ sentAt: -1 })
    .toArray();
  console.log({ allMessage })
  allMessage.sort((a, b) => a.sentAt - b.sentAt);
  return allMessage;
}