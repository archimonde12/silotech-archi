import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { saveLog } from "../../../ulti";

const chat_get_all_members = async (root: any, args: any, ctx: any): Promise<any> => {
    const clientIp = getClientIp(ctx.req)
    const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
    increaseTicketNo()
    try {
        //Create request log
        saveLog(ticket, args, chat_get_all_members.name, "request", "received a request", clientIp)
        console.log("======GET ALL MEMBERS=====");
        //Get arguments
        console.log({ args });
        const { roomId, pageSize = 10, page = 1 } = args;
        //Check arguments
        if (!roomId) throw new Error("CA:020")
        if (pageSize < 1 || page < 1) throw new Error("CA:059")
        const objectRoomId = new ObjectId(roomId);
        //Check roomId exist
        const RoomData = await db
            .collection(collectionNames.rooms)
            .findOne({ _id: objectRoomId });
        // console.log({ RoomData });
        if (!RoomData) {
            console.log('0 document was found in the room collection')
            throw new Error("CA:016");
        }
        console.log('1 document was found in the room collection')
        //Check member
        const membersData = await db
            .collection(collectionNames.members)
            .find({ roomId: objectRoomId }).limit(pageSize).skip(pageSize * (page - 1)).toArray();
        // console.log({ membersData });
        console.log(`${membersData.length} document(s) was/were found in the room collection`)
        if (membersData.length === RoomData.totalMembers) {
            //Create success logs
            saveLog(ticket, args, chat_get_all_members.name, "success", "successful", clientIp)
            return membersData
        }
        throw new Error("CA:004");
    } catch (e) {
        //Create error logs
        const errorResult = JSON.stringify({
            name: e.name,
            message: e.message,
            stack: e.stack
        })
        saveLog(ticket, args, chat_get_all_members.name, "error", errorResult, clientIp)
        console.log(e)
        if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
            throw new Error(e.message)
        } else {
            captureExeption(e, { args })
            throw new Error("CA:004")
        }
    }
}
export { chat_get_all_members }