import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { collectionNames, db } from "../../../mongo";
import { ErrorResolve, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

const chat_get_room_details = async (root: any, args: any, ctx: any): Promise<any> => {
    const clientIp = getClientIp(ctx.req)
    const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
    increaseTicketNo()

    try {
        //Create request log
        saveRequestLog(ticket, args, chat_get_room_details.name,  clientIp)
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
        saveSuccessLog(ticket, args, chat_get_room_details.name,  "successful", clientIp)
        return RoomData
    } catch (e) {
        //Create error logs
        const errorResult = JSON.stringify({
            name: e.name,
            message: e.message,
            stack: e.stack
        })
        saveErrorLog(ticket, args, chat_get_room_details.name, errorResult, clientIp)
        ErrorResolve(e, args, chat_get_room_details.name)
    }
}
export { chat_get_room_details }