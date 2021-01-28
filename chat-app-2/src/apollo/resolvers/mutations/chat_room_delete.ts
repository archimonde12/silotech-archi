import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { ResultMessage } from "../../../models/ResultMessage";
import { RoomInMongo } from "../../../models/Room";
import {
  client,
  collectionNames,
  db,
  transactionOptions,
} from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { checkRoomIdInMongoInMutation, getSlugByToken, saveLog } from "../../../ulti";

const chat_room_delete = async (
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
    saveLog(ticket, args, chat_room_delete.name, "request", "received a request", clientIp)

    console.log("======ROOM DELETE=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { roomId } = args;
    const objectRoomId = new ObjectId(roomId);
    //Check arguments
    if (!roomId.trim() || !roomId) throw new Error("CA:020");
    //Verify token and get slug
    const createrSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: "",
      data: null,
    };
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the room collection')
        throw new Error("CA:016")
      }
      console.log('1 document was found in the room collection')
      //Check room type
      if (RoomData.type === `global` && createrSlug !== ADMIN_KEY) throw new Error("CA:044")
      //Check master
      if (createrSlug !== RoomData.createdBy.slug) throw new Error("CA:017")
      console.log(`${createrSlug} is the master of this room`)
      //Delete the room
      const deleteRoomRes = await db
        .collection(collectionNames.rooms)
        .deleteOne({ _id: objectRoomId }, { session });
      console.log(`${deleteRoomRes.deletedCount} document was deleted in the rooms collection`)
      //Remove and user
      const deleteMembersRes = await db
        .collection(collectionNames.members)
        .deleteMany({ roomId: objectRoomId }, { session });
      console.log(`${deleteMembersRes.deletedCount} document was deleted in the members collection`)
      //Delete all message
      const deleteMessagesRes = await db
        .collection(collectionNames.messages)
        .deleteMany({ roomId }, { session });
      console.log(`${deleteMessagesRes.deletedCount} document was deleted in the messages collection`)
      finalResult.message = `delete this room success!`;
      //Create success logs
      saveLog(ticket, args, chat_room_delete.name, "success", finalResult.message, clientIp)
    }, transactionOptions);
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
    saveLog(ticket, args, chat_room_delete.name, "error", errorResult, clientIp)

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
export { chat_room_delete };
