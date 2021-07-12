import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { GLOBAL_KEY } from "../../../config";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { collectionNames, db } from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { createInboxRoomKey, ErrorResolve, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

const chat_api_messages_in_room_get = async (root: any, args: any, ctx: any): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  try {
    //Create request log
    saveRequestLog(ticket, args, chat_api_messages_in_room_get.name, clientIp)
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
        break;
      case 'publicRoom':
        result = await getMessInPublicRoom(receiver, pageSize, page)
        break;
      case 'inbox':
        result = await getMessInInboxRoom(sender, receiver, pageSize, page)
        break;
      default: throw new Error('CA:021')
    }
    //Create success logs
    saveSuccessLog(ticket, args, chat_api_messages_in_room_get.name, "successful", clientIp)
    return result
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_api_messages_in_room_get.name, errorResult, clientIp)
    ErrorResolve(e, args, chat_api_messages_in_room_get.name)
  }
};
export { chat_api_messages_in_room_get };

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