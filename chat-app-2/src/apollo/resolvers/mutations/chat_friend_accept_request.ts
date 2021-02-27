import { getClientIp } from "@supercharge/request-ip/dist";
import { FriendInMongo } from "../../../models/Friend";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { createCheckFriendQuery, ErrorResolve, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

const chat_friend_accept_request = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  const session = client.startSession();
  try {
    saveRequestLog(ticket, args, chat_friend_accept_request.name, clientIp)
    const token = ctx.req.headers.authorization;
    const { senderSlug } = args;
    if (!senderSlug || !senderSlug.trim()) throw new Error("CA:009");

    const receiverSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: '',
      data: null
    }

    await session.withTransaction(async () => {
      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      const checkFriendRelationShip: FriendInMongo | null = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      if (!checkFriendRelationShip) throw new Error('CA:007')
      if (checkFriendRelationShip.isFriend) throw new Error('CA:005')
      if (checkFriendRelationShip.isBlock) throw new Error('CA:006')
      if (checkFriendRelationShip._friendRequestFrom !== senderSlug) throw new Error('CA:008')
      if (checkFriendRelationShip._friendRequestFrom === null) throw new Error('CA:033')

      const now = new Date();

      const updateDoc = {
        $set: { _friendRequestFrom: null, isFriend: true, beFriendAt: now },
      };
      const { modifiedCount } = await db
        .collection(collectionNames.friends)
        .updateOne(checkFriendQuery, updateDoc, { session });

      finalResult.message = `${receiverSlug} and ${senderSlug} become friends`
      saveSuccessLog(ticket, args, chat_friend_accept_request.name, finalResult.message, clientIp)
    }, transactionOptions)
    return finalResult
  } catch (e) {
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_friend_accept_request.name, errorResult, clientIp)
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    ErrorResolve(e, args, chat_friend_accept_request.name)
  } finally {
    session.endSession()
  }
}

export { chat_friend_accept_request };