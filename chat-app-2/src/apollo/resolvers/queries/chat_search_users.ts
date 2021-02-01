import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { saveLog } from "../../../ulti";

const chat_search_users = async (root: any, args: any, ctx: any) => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
  increaseTicketNo()
  try {
    //Create request log
    saveLog(ticket, args, chat_search_users.name, "request", "received a request", clientIp)
    console.log("===GET ALL FRIEND REQUESTS===");
    //Get arguments
    console.log({ args });
    const { text, limit = 7 } = args;
    if (!text || text.strim()) throw new Error("CA:060")
    if (limit < 1) throw new Error("CA:061")
    const searchText = new RegExp(`${text}`, 'i')
    console.log({ searchText })
    //const query = { slug: { $regex: textLowerCase } };
    const query = { slug: { $regex: text } };

    const allUserQuery = await db
      .collection(collectionNames.users)
      .find(query)
      .limit(limit)
      .toArray();
    //Create success logs
    saveLog(ticket, args, chat_search_users.name, "success", "successful", clientIp)
    return allUserQuery;
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveLog(ticket, args, chat_search_users.name, "error", errorResult, clientIp)
    console.log(e)
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      captureExeption(e, { args })
      throw new Error("CA:004")
    }
  }
};
export { chat_search_users };
