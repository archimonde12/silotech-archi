import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { collectionNames, db } from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { ErrorResolve, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

const chat_api_all_friend_request_get = async (root: any, args: any, ctx: any) => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  try {
    //Create request log
    saveRequestLog(ticket, args, chat_api_all_friend_request_get.name, clientIp)
    console.log("===GET ALL FRIEND REQUESTS===")
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization
    const { pageSize = 10, page = 1 } = args;
    if (pageSize < 1 || page < 1) throw new Error("CA:059")
    //Verify token and get slug
    const slug = await getSlugByToken(token)
    //Query all friends of slug
    const query = { $and: [{ $or: [{ slug1: slug }, { slug2: slug }] }, { isFriend: false }, { _friendRequestFrom: { $nin: [slug, null] } }] }
    const getAllFriendRequestsRes = await db.collection(collectionNames.friends).find(query).limit(pageSize).skip((page - 1) * pageSize).toArray()
    console.log(`${getAllFriendRequestsRes.length} document(s) was/were found in the friends collection`)
    const AllFriendRequests = getAllFriendRequestsRes.map(friendContract => friendContract.slug1 === slug ? { slug: friendContract.slug2 } : { slug: friendContract.slug1 })
    console.log({ AllFriendRequests })
    //Create success logs
    saveSuccessLog(ticket, args, chat_api_all_friend_request_get.name, "successful", clientIp)
    return AllFriendRequests
  }
  catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_api_all_friend_request_get.name, errorResult, clientIp)
    ErrorResolve(e, args, chat_api_all_friend_request_get.name)
  }
}
export { chat_api_all_friend_request_get }
