import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { saveLog } from "../../../ulti";

const chat_get_room_details = async (root: any, args: any, ctx: any): Promise<any> => {
    const clientIp = getClientIp(ctx.req)
    const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
    increaseTicketNo()

    try {
        //Create request log
        saveLog(ticket, args, chat_get_room_details.name, "request", "received a request", clientIp)
        console.log("======GET ROOM DETAILS=====");
        //Get arguments
        console.log({ args });
        const { roomId } = args;
        if (!roomId) throw new Error("CA:020")
        const objectRoomId = new ObjectId(roomId);
        //Check roomId exist
        const RoomData = await db
            .collection(collectionNames.rooms)
            .findOne({ _id: objectRoomId });
        console.log({ RoomData });
        if (!RoomData) throw new Error("CA:016")
        //Create success logs
        saveLog(ticket, args, chat_get_room_details.name, "success", "successful", clientIp)
        return RoomData
    } catch (e) {
        //Create error logs
        const errorResult = JSON.stringify({
            name: e.name,
            message: e.message,
            stack: e.stack
        })
        saveLog(ticket, args, chat_get_room_details.name, "error", errorResult, clientIp)
        console.log(e)
        if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
            throw new Error(e.message)
        } else {
            captureExeption(e, { args })
            throw new Error("CA:004")
        }
    }
}
export { chat_get_room_details }