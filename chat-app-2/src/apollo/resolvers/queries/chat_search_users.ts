import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { collectionNames, db } from "../../../mongo";
import { ErrorResolve, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

const chat_search_users = async (root: any, args: any, ctx: any) => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  try {
    //Create request log
    saveRequestLog(ticket, args, chat_search_users.name, clientIp)
    console.log("===GET ALL FRIEND REQUESTS===");
    //Get arguments
    // console.log({ args });
    const { text, limit = 7 } = args;
    if (!text || text.trim()) throw new Error("CA:060")
    if (limit < 1) throw new Error("CA:061")
    const searchText = new RegExp(`${text}`, 'i')
    // console.log({ searchText })
    //const query = { slug: { $regex: textLowerCase } };
    const query = { slug: { $regex: text } };

    const allUserQuery = await db
      .collection(collectionNames.users)
      .find(query)
      .limit(limit)
      .toArray();
    //Create success logs
    saveSuccessLog(ticket, args, chat_search_users.name, "successful", clientIp)
    return allUserQuery;
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_search_users.name, errorResult, clientIp)
    ErrorResolve(e, args, chat_search_users.name)
  }
};
export { chat_search_users };
