import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { RoomTypes } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { saveLog } from "../../../ulti";

const chat_get_all_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
  increaseTicketNo()
  try {
    //Create request log
    saveLog(ticket, args, chat_get_all_rooms.name, "request", "received a request", clientIp)
    const { pageSize = 10, page = 1 } = args;
    if (pageSize < 1 || page < 1) throw new Error("CA:059")
    console.log("======GET ALL ROOMS=====");
    //Get all public room
    const allRooms = await db.collection(collectionNames.rooms).find({ $or: [{ type: RoomTypes.public }, { type: RoomTypes.global }] }).sort({ "lastMess.sentAt": -1 }).limit(pageSize).skip(pageSize * (page - 1)).toArray()
    console.log(`${allRooms.length} document was found in the rooms collection`)
    //Create success logs
    saveLog(ticket, args, chat_get_all_rooms.name, "success", "successful", clientIp)
    return allRooms
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveLog(ticket, args, chat_get_all_rooms.name, "error", errorResult, clientIp)

    console.log(e)
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      captureExeption(e, { args })
      throw new Error("CA:004")
    }
  }
}
export { chat_get_all_rooms }