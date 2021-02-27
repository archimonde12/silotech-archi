import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, Log, ticketNo } from "../../../models/Log";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { checkUsersInDatabase, createCheckFriendQuery, ErrorResolve, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

const chat_friend_block_remove = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  const session = client.startSession();
  try {
    saveRequestLog(ticket, args, chat_friend_block_remove.name, clientIp)

    const token = ctx.req.headers.authorization;
    const { senderSlug } = args;

    if (!senderSlug || !senderSlug.trim()) throw new Error("CA:009");

    const receiverSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: '',
      data: null
    }
    await session.withTransaction(async () => {
      let slugsInDatabase = await checkUsersInDatabase([senderSlug], session)
      if (slugsInDatabase.length !== 1) throw new Error("CA:009");
      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      const checkFriend = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      if (!checkFriend) throw new Error("CA:010")
      if (checkFriend._blockRequest !== receiverSlug) throw new Error("CA:011")

      const updateDoc = { $set: { isBlock: false, _blockRequest: null } }
      const { modifiedCount } = await db
        .collection(collectionNames.friends)
        .updateOne(checkFriendQuery, updateDoc, { session });
      finalResult.message = `${receiverSlug} removed block ${senderSlug} successful`
      saveSuccessLog(ticket, args, chat_friend_block_remove.name, finalResult.message, clientIp)
    }, transactionOptions)
    return finalResult
  } catch (e) {
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_friend_block_remove.name, errorResult, clientIp)
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    ErrorResolve(e, args, chat_friend_block_remove.name)
  } finally {
    session.endSession()
  }
};

export { chat_friend_block_remove };
