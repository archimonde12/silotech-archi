import { getClientIp } from "@supercharge/request-ip/dist";
import { FriendInMongo } from "../../../models/Friend";
import { increaseTicketNo, Log, ticketNo } from "../../../models/Log";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { createCheckFriendQuery, ErrorResolve, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";


const chat_friend_reject_request = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  const session = client.startSession();
  try {

    //Create request log

    saveRequestLog(ticket, args, chat_friend_reject_request.name, clientIp)

    //Get arguments

    const token = ctx.req.headers.authorization;
    const { senderSlug } = args;

    //Check arguments

    if (!senderSlug || !senderSlug.trim()) throw new Error("CA:009");

    //Verify token and get slug

    const receiverSlug = await getSlugByToken(token);
    if (senderSlug === receiverSlug) throw new Error("CA:066")
    let finalResult: ResultMessage = {
      message: '',
      data: null
    }
    await session.withTransaction(async () => {
      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      const checkFriend: FriendInMongo | null = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      if (!checkFriend) {
        await session.abortTransaction();
        throw new Error("CA:014")
      }

      if (checkFriend.isFriend) throw new Error("CA:005")
      if (checkFriend.isBlock) throw new Error("CA:006")
      if (checkFriend._friendRequestFrom !== senderSlug) throw new Error("CA:007")

      //Update friend document

      const updateDoc = { $set: { _friendRequestFrom: null } };
      const { modifiedCount } = await db
        .collection(collectionNames.friends)
        .updateOne(checkFriendQuery, updateDoc, { session });
      finalResult.message = `${receiverSlug} reject ${senderSlug}'s friend request!`

      //Create success logs

      saveSuccessLog(ticket, args, chat_friend_reject_request.name, finalResult.message, clientIp)
    }, transactionOptions)
    return finalResult
  } catch (e) {

    //Create error logs

    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_friend_reject_request.name, errorResult, clientIp)

    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    ErrorResolve(e, args, chat_friend_reject_request.name)
  } finally {
    session.endSession()
  }
};
export { chat_friend_reject_request };
