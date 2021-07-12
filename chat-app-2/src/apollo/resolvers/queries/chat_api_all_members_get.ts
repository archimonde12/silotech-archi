import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { collectionNames, db } from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { ErrorResolve, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

const chat_api_all_members_get = async (root: any, args: any, ctx: any): Promise<any> => {
    const clientIp = getClientIp(ctx.req)
    const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
    increaseTicketNo()
    try {
        //Create request log
        saveRequestLog(ticket, args, chat_api_all_members_get.name, clientIp)
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
            saveSuccessLog(ticket, args, chat_api_all_members_get.name, "successful", clientIp)
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
        saveErrorLog(ticket, args, chat_api_all_members_get.name, errorResult, clientIp)
        ErrorResolve(e, args, chat_api_all_members_get.name)
    }
}
export { chat_api_all_members_get }