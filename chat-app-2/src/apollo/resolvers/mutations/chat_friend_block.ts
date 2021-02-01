import { getClientIp } from "@supercharge/request-ip/dist";
import { Friend, FriendInMongo } from "../../../models/Friend";
import { increaseTicketNo, Log, ticketNo } from "../../../models/Log";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { checkUsersInDatabase, createCheckFriendQuery, getSlugByToken, saveLog } from "../../../ulti";
import { chat_room_block } from "./chat_room_block";

const chat_friend_block = async (root: any,
  args: any,
  ctx: any): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
  increaseTicketNo()
  //Start transaction
  const session = client.startSession();
  try {
    //Create request log
    saveLog(ticket, args, chat_friend_block.name, "request", "received a request", clientIp)
    console.log("======FRIEND BLOCK REQUEST=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    console.log({ token })
    const { senderSlug } = args;
    //Check arguments
    if (!senderSlug || !senderSlug.trim()) throw new Error("CA:009");
    //Verify token and get slug
    const receiverSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: '',
      data: null
    }
    const transactionResults: any = await session.withTransaction(async () => {
      //Check senderSlug exist in database
      let slugsInDatabase = await checkUsersInDatabase([senderSlug], session)
      if (slugsInDatabase.length !== 1) throw new Error("CA:009")
      //Check friend relationship exist and request has been sent
      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      const checkFriend: FriendInMongo | null = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      // console.log({ checkFriend });
      if (!checkFriend) {
        console.log("0 document was found in friends collection")
        //create new friend document if not exist
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
        console.log(`1 new document was inserted to friends collection`)
        finalResult.message = `${receiverSlug} blocked ${senderSlug}!`
        return
      }
      console.log("1 document was found in friends collection")
      //update friend documents if exist
      if (checkFriend._blockRequest) throw new Error("CA:012")
      const updateDoc = {
        $set: { _friendRequestFrom: null, isBlock: true, _blockRequest: receiverSlug },
      };
      const { modifiedCount } = await db
        .collection(collectionNames.friends)
        .updateOne(checkFriendQuery, updateDoc, { session });
      console.log(`${modifiedCount} document(s) was/were updated in friends collection`)
      finalResult.message = `block successful!`
      //Create success logs
      saveLog(ticket, args, chat_friend_block.name, "success", finalResult.message, clientIp)
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
    saveLog(ticket, args, chat_friend_block.name, "error", errorResult, clientIp)

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
}
export { chat_friend_block };
