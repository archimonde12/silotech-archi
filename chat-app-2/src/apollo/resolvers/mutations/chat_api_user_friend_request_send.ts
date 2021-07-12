import { getClientIp } from "@supercharge/request-ip/dist";
import { Friend, FriendInMongo } from "../../../models/Friend";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { ResultMessage } from "../../../models/ResultMessage";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { checkUsersInDatabase, createCheckFriendQuery, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

export const chat_api_user_friend_request_send = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  //Start transaction
  const session = client.startSession();
  try {

    //Create request log

    saveRequestLog(ticket, args, chat_api_user_friend_request_send.name, clientIp)

    //Get arguments

    const token = ctx.req.headers.authorization;
    const { receiverSlug } = args;

    //Check arguments

    if (!receiverSlug || !receiverSlug.trim()) throw new Error("CA:009");

    //Verify token and get slug

    const senderSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: '',
      data: null
    }
    await session.withTransaction(async () => {

      //Check friend relationship exist and request has been sent

      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      const checkFriend: FriendInMongo | null = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });

      if (checkFriend) {

        if (checkFriend.isFriend) throw new Error("CA:005")
        if (checkFriend.isBlock) throw new Error("CA:006")
        if (checkFriend._friendRequestFrom !== null) throw new Error("CA:008")

        const updateRes = await db
          .collection(collectionNames.friends)
          .updateOne(
            checkFriendQuery,
            { $set: { _friendRequestFrom: senderSlug } },
            { session }
          );

        finalResult.message = `${senderSlug} sent a friend request to ${receiverSlug}`
        return
      }

      //Create new friend document
      const now = new Date();
      const checkSlugs = [senderSlug, receiverSlug];
      //Check sender and receiver exist in database
      const slugsInDatabase = await checkUsersInDatabase(checkSlugs, session)
      if (slugsInDatabase.length !== 2) throw new Error("CA:009")
      const newFriendDocument: Friend = {
        slug1: senderSlug > receiverSlug ? senderSlug : receiverSlug,
        slug2: senderSlug <= receiverSlug ? senderSlug : receiverSlug,
        lastRequestSentAt: now,
        beFriendAt: null,
        isFriend: false,
        isBlock: false,
        _friendRequestFrom: senderSlug,
        _blockRequest: null,
      };
      // console.log({ newFriendDocument });
      const { insertedId } = await db
        .collection(collectionNames.friends)
        .insertOne(newFriendDocument, { session });
      // console.log({ insertedId });
      console.log(`1 new document was inserted to friends collection`)
      finalResult.message = `${senderSlug} sent a friend request to ${receiverSlug}!`
      //Create success logs
      saveSuccessLog(ticket, args, chat_api_user_friend_request_send.name, finalResult.message, clientIp)
    }, transactionOptions)
    return finalResult
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_api_user_friend_request_send.name, errorResult, clientIp)

    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.log("The transaction was aborted due to " + e);
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      CaptureException(e, { args })
      throw new Error("CA:004")
    }
  } finally {
    session.endSession()
  }
};
