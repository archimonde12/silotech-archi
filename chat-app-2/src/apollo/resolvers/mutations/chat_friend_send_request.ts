import { getClientIp } from "@supercharge/request-ip/dist";
import { Friend, FriendInMongo } from "../../../models/Friend";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { ResultMessage } from "../../../models/ResultMessage";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { checkUsersInDatabase, createCheckFriendQuery, getSlugByToken, saveLog } from "../../../ulti";

const chat_friend_send_request = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
  increaseTicketNo()
  //Start transaction
  const session = client.startSession();
  try {
    //Create request log
    saveLog(ticket, args, chat_friend_send_request.name, "request", "received a request", clientIp)
    console.log("======FRIEND REQUEST SEND=====");
    //Get arguments
    console.log({ args });
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
    const transactionResults: any = await session.withTransaction(async () => {
      //Check friend relationship exist and request has been sent
      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      const checkFriend: FriendInMongo | null = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      // console.log({ checkFriend });
      if (checkFriend) {
        console.log("1 document was found in friends collection");
        //Check is Friend
        if (checkFriend.isFriend) throw new Error("CA:005")
        //Check block
        if (checkFriend.isBlock) throw new Error("CA:006")
        //Check friend request from
        if (checkFriend._friendRequestFrom !== null) throw new Error("CA:008")
        //update friend document
        const updateRes = await db
          .collection(collectionNames.friends)
          .updateOne(
            checkFriendQuery,
            { $set: { _friendRequestFrom: senderSlug } },
            { session }
          );
        console.log(`${updateRes.modifiedCount} document(s) was/were updated in friends collection to include the friend request from`)
        finalResult.message = `${senderSlug} sent a friend request to ${receiverSlug}`
        return
      }
      console.log("0 document was found in friends collection");
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
       saveLog(ticket, args, chat_friend_send_request.name, "success", finalResult.message, clientIp)
    }, transactionOptions)
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    return finalResult
  } catch (e) {
        //Create error logs
        const errorResult = JSON.stringify({
          name: e.name,
          message: e.message,
          stack: e.stack
        })
        saveLog(ticket, args, chat_friend_send_request.name, "error", errorResult, clientIp)

    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.log("The transaction was aborted due to " + e);
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      captureExeption(e, { args })
      throw new Error("CA:004")
    }
  } finally {
    session.endSession()
  }
};
export { chat_friend_send_request };
