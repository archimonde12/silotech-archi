import { ObjectId } from "mongodb";
import { GLOBAL_KEY } from "../../../config";
import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { createInboxRoomKey, getSlugByToken } from "../../../ulti";

const chat_get_messages_in_room = async (root: any, args: any, ctx: any): Promise<any> => {
  try {
    console.log("======GET MESSAGES=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization
    const { room, pageSize = 10, page = 1 } = args;
    const { roomType, receiver } = room
    //check arguments
    if (!roomType) throw new Error("CA:021")
    if (!receiver) throw new Error("CA:022")
    if (pageSize < 1 || page < 1) throw new Error("CA:059")
    //Verify token and get slug
    const sender = await getSlugByToken(token)
    let result: any
    //Check arguments
    if (!token || !room) throw new Error("all arguments must be provided")
    switch (roomType) {
      case 'global':
        result = await getMessInGlobal(pageSize, page)
        return result
      case 'publicRoom':
        result = await getMessInPublicRoom(receiver, pageSize, page)
        return result
      case 'inbox':
        result = await getMessInInboxRoom(sender, receiver, pageSize, page)
        return result
      default: throw new Error('CA:021')
    }
  } catch (e) {
    console.log(e)
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      captureExeption(e, { args })
      throw new Error("CA:004")
    }
  }
};
export { chat_get_messages_in_room };

const getMessInPublicRoom = async (receiver: string, pageSize: number, page: number) => {
  try {
    //receiver is a room
    if (ObjectId.isValid(receiver) && receiver && receiver.trim()) {
      const objectRoomId = new ObjectId(receiver);
      //Check roomId exist
      const RoomData = await db
        .collection(collectionNames.rooms)
        .findOne({ _id: objectRoomId });
      console.log({ RoomData });
      if (!RoomData) throw new Error("CA:016");
      //Query Message
      const allMessage = await db
        .collection(collectionNames.messages)
        .find({ roomId: receiver })
        .limit(pageSize)
        .skip(pageSize * (page - 1))
        .sort({ sentAt: -1 })
        .toArray();
      console.log({ allMessage })
      allMessage.sort((a, b) => a.sentAt - b.sentAt);
      return allMessage;
    }
    throw new Error("CA:027");
  } catch (e) {
    throw e
  }

}
const getMessInInboxRoom = async (sender: string, receiver: string, pageSize: number, page: number) => {
  try {
    if (sender === receiver) throw new Error('CA:062')
    const roomKey = createInboxRoomKey(sender, receiver)
    const checkSlugs = [sender, receiver]
    //Check sender and receiver exist in database
    const findUsersRes = await db
      .collection(collectionNames.users)
      .find({ slug: { $in: checkSlugs } })
      .toArray();
    console.log({ findUsersRes })
    if (findUsersRes.length !== 2) throw new Error('CA:010')
    //Query Message
    const allMessage = await db
      .collection(collectionNames.messages)
      .find({ roomId: roomKey })
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ sentAt: -1 })
      .toArray();
    allMessage.sort((a, b) => a.sentAt - b.sentAt);
    return allMessage;
  }
  catch (e) {
    throw e
  }
}
const getMessInGlobal = async (pageSize: number, page: number) => {
  try {
    //Query Message
    const allMessage = await db
      .collection(collectionNames.messages)
      .find({ roomId: GLOBAL_KEY })
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ sentAt: -1 })
      .toArray();
    console.log({ allMessage })
    allMessage.sort((a, b) => a.sentAt - b.sentAt);
    return allMessage;
  } catch (e) {
    throw e
  }
}