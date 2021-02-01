import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { getSlugByToken, saveLog } from "../../../ulti";

const chat_get_all_friends = async (root: any, args: any, ctx: any) => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
  increaseTicketNo()
  try {
    //Create request log
    saveLog(ticket, args, chat_get_all_friends.name, "request", "received a request", clientIp)
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
    saveLog(ticket, args, chat_get_all_friends.name, "success", "successful", clientIp)
    return allFriends
  }
  catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveLog(ticket, args, chat_get_all_friends.name, "error", errorResult, clientIp)
    console.log(e)
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      captureExeption(e, { args })
      throw new Error("CA:004")
    }
  }

}
export { chat_get_all_friends }