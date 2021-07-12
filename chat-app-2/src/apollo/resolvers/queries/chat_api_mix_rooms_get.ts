
import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { MemberInMongo } from "../../../models/Member";
import { InboxRoom, RoomTypes } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { ErrorResolve, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

export const chat_api_mix_rooms_get = async (root: any, args: any, ctx: any) => {
    const clientIp = getClientIp(ctx.req)
    const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
    increaseTicketNo()

    try {
        //Create request log
        saveRequestLog(ticket, args, chat_api_mix_rooms_get.name,  clientIp)
        console.log("=====GET MIX ROOMS=====")
        //Get arguments
        console.log({ args });
        const token = ctx.req.headers.authorization
        const { pageSize = 10, page = 1 } = args;
        if (pageSize < 1 || page < 1) throw new Error("CA:059")
        //Check arguments
        const slug = await getSlugByToken(token)

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
        console.log({ AllRoomIdsOfSlug })
        const allRooms: InboxRoom[] = await db.collection(collectionNames.rooms).find({ $or: [{ _id: { $in: AllRoomIdsOfSlug } }, { pair: { $all: [{ slug }] } }] }).sort({ "lastMess.sentAt": -1 }).limit(pageSize).skip(pageSize * (page - 1)).toArray()
        console.log({ allRooms })
        const sortFunc = (a, b) => {
            if (a.lastMess.sentAt < b.lastMess.sentAt) { return 1; }
            if (a.lastMess.sentAt > b.lastMess.sentAt) { return -1; }
            return 0;
        }
        allRooms.sort(sortFunc)
        //Create success logs
        saveSuccessLog(ticket, args, chat_api_mix_rooms_get.name,  "successful", clientIp)
        return allRooms.slice(0, pageSize)
    } catch (e) {
        //Create error logs
        const errorResult = JSON.stringify({
            name: e.name,
            message: e.message,
            stack: e.stack
        })
        saveErrorLog(ticket, args, chat_api_mix_rooms_get.name, errorResult, clientIp)
        ErrorResolve(e, args, chat_api_mix_rooms_get.name)
    }
}

