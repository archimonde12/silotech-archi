import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { collectionNames, db } from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { ErrorResolve, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

const chat_api_all_friends_get = async (root: any, args: any, ctx: any) => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  try {
    //Create request log
    saveRequestLog(ticket, args, chat_api_all_friends_get.name, clientIp)
    console.log("===GET ALL FRIENDS===")
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization
    const { pageSize = 10, page = 1 } = args;
    if (pageSize < 1 || page < 1) throw new Error("CA:059")
    //Verify token and get slug
    const slug = await getSlugByToken(token)
    //Query all friends of slug
    const query = { $or: [{ slug1: slug }, { slug2: slug }], isFriend: true }
    const getAllFriendsRes = await db.collection(collectionNames.friends).find(query).limit(pageSize).skip(page * pageSize).toArray()
    // console.log(`${getAllFriendsRes.length} document(s) was/were found in the friends collection`)
    const allFriends = getAllFriendsRes.map(friendContract => friendContract.slug1 === slug ? { slug: friendContract.slug2 } : { slug: friendContract.slug1 })
    console.log({ allFriends })
    //Create success logs
    saveSuccessLog(ticket, args, chat_api_all_friends_get.name, "successful", clientIp)
    return allFriends
  }
  catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_api_all_friends_get.name, errorResult, clientIp)
    ErrorResolve(e, args, chat_api_all_friends_get.name)
  }

}
export { chat_api_all_friends_get }