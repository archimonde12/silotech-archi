import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { RoomTypes } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { getSlugByToken, saveLog } from "../../../ulti";
/**
 * @deprecated
 */
const chat_get_other_public_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
    const clientIp = getClientIp(ctx.req)
    const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
    increaseTicketNo()
    try {
        //Create request log
        saveLog(ticket, args, chat_get_other_public_rooms.name, "request", "received a request", clientIp)
        console.log("======GET OTHER PUBLIC ROOMS=====");
        //Get arguments
        console.log({ args });
        const token = ctx.req.headers.authorization
        //Check arguments 
        if (!token || !token.trim()) throw new Error("all arguments must be provided")
        //Verify token and get slug
        const slug = await getSlugByToken(token)
        //Check member data
        const membersData = await db
            .collection(collectionNames.members)
            .aggregate([
                {
                    $lookup:
                    {
                        from: collectionNames.rooms,
                        localField: 'roomId',
                        foreignField: '_id',
                        as: 'roomDetails'
                    }
                }, {
                    $match: {
                        slug
                    }
                }
            ]).toArray();
        console.log({ membersData })
        const slugRooms = membersData.map(member => member.roomDetails[0])
        console.log({ slugRooms })
        const slugPublicRooms = slugRooms.filter(room => room.type === RoomTypes.public)
        console.log({ slugPublicRooms })
        const slugPublicRoomIds = slugPublicRooms.map(room => room._id.toString())
        console.log({ slugPublicRoomIds })
        //Get all public room
        const allPubLicRooms = await db.collection(collectionNames.rooms).find({ type: RoomTypes.public }).toArray()
        console.log({ allPubLicRooms })
        const otherPublicRoooms = allPubLicRooms.filter(publicroom => !slugPublicRoomIds.includes(publicroom._id.toString()))
        console.log({ otherPublicRoooms })
        const sortFunc = (a, b) => {
            return b.updatedAt - a.updatedAt
        }
        otherPublicRoooms.sort(sortFunc)
        //Create success logs
        saveLog(ticket, args, chat_get_other_public_rooms.name, "success", "successful", clientIp)
        return otherPublicRoooms
    } catch (e) {
        //Create error logs
        const errorResult = JSON.stringify({
            name: e.name,
            message: e.message,
            stack: e.stack
        })
        saveLog(ticket, args, chat_get_other_public_rooms.name, "error", errorResult, clientIp)
        console.log(e)
        if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
            throw new Error(e.message)
        } else {
            captureExeption(e, { args })
            throw new Error("CA:004")
        }
    }
}
export { chat_get_other_public_rooms }