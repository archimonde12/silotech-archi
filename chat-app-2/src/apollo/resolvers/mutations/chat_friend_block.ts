import { getClientIp } from "@supercharge/request-ip/dist";
import { Friend, FriendInMongo } from "../../../models/Friend";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { checkUsersInDatabase, createCheckFriendQuery, ErrorResolve, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

const chat_friend_block = async (root: any,
  args: any,
  ctx: any): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  const session = client.startSession();
  try {
    //Create request log
    saveRequestLog(ticket, args, chat_friend_block.name, clientIp)
    //Get arguments
    const token = ctx.req.headers.authorization;
    const { senderSlug } = args;
    //Check arguments
    if (!senderSlug || !senderSlug.trim()) throw new Error("CA:009");
    //Verify token and get slug
    const receiverSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: '',
      data: null
    }
    await session.withTransaction(async () => {
      //Check senderSlug exist in database
      let slugsInDatabase = await checkUsersInDatabase([senderSlug], session)
      if (slugsInDatabase.length !== 1) throw new Error("CA:009")
      //Check friend relationship exist and request has been sent
      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      const checkFriend: FriendInMongo | null = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      if (!checkFriend) {
        //Create new friend document if not exist
        const newFriendDocument: Friend = {
          slug1: senderSlug > receiverSlug ? senderSlug : receiverSlug,
          slug2: senderSlug <= receiverSlug ? senderSlug : receiverSlug,
          lastRequestSentAt: null,
          beFriendAt: null,
          isFriend: false,
          isBlock: true,
          _friendRequestFrom: null,
          _blockRequest: receiverSlug,
        };
        const { insertedId } = await db
          .collection(collectionNames.friends)
          .insertOne(newFriendDocument, { session });
        finalResult.message = `${receiverSlug} blocked ${senderSlug}!`
        return
      }
      //update friend documents if exist
      if (checkFriend._blockRequest) throw new Error("CA:012")
      const updateDoc = {
        $set: { _friendRequestFrom: null, isBlock: true, _blockRequest: receiverSlug },
      };
      const { modifiedCount } = await db
        .collection(collectionNames.friends)
        .updateOne(checkFriendQuery, updateDoc, { session });
      finalResult.message = `block successful!`
      //Create success logs
      saveSuccessLog(ticket, args, chat_friend_block.name, finalResult.message, clientIp)
    }, transactionOptions)
    return finalResult
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_friend_block.name, errorResult, clientIp)

    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    ErrorResolve(e, args, chat_friend_block.name)
  } finally {
    session.endSession()
  }
}
export { chat_friend_block };
