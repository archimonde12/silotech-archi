
import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { InboxRoom } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { ErrorResolve, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

const chat_api_inbox_rooms_get = async (root: any, args: any, ctx: any): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  try {
    //Create request log
    saveRequestLog(ticket, args, chat_api_inbox_rooms_get.name,  clientIp)
    console.log("=====GET INBOX ROOMS=====")
    //Get arguments
    const token = ctx.req.headers.authorization
    const { pageSize = 10, page = 1 } = args;
    if (pageSize < 1 || page < 1) throw new Error("CA:059")

    //Verify token and get slug
    const slug = await getSlugByToken(token)
    //Query all inbox room that slug is a member
    const inboxRoomsData: InboxRoom[] = await db.collection(collectionNames.rooms).find({ pair: { $all: [{ slug }] } }).sort({ "lastMess.sentAt": -1 }).limit(pageSize).skip(pageSize * (page - 1)).toArray()
    // console.log({ inboxRoomsData })
    console.log(`${inboxRoomsData.length} document was found in the rooms collection`)
    //Create success logs
    saveSuccessLog(ticket, args, chat_api_inbox_rooms_get.name,  "successful", clientIp)
    return inboxRoomsData
  }
  catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_api_inbox_rooms_get.name, errorResult, clientIp)
    ErrorResolve(e, args, chat_api_inbox_rooms_get.name)
  }
}

export { chat_api_inbox_rooms_get }