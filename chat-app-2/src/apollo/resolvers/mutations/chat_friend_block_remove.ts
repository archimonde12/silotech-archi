import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, Log, ticketNo } from "../../../models/Log";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { checkUsersInDatabase, createCheckFriendQuery, getSlugByToken, saveLog } from "../../../ulti";

const chat_friend_block_remove = async (
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
    saveLog(ticket, args, chat_friend_block_remove.name, "request", "received a request", clientIp)
    
    console.log("======FRIEND BLOCK REMOVE=====");
    //Get arguments
    console.log({ args });
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
    const transactionResults: any = await session.withTransaction(async () => {
      //Check senderSlug exist in database
      let slugsInDatabase = await checkUsersInDatabase([senderSlug], session)
      if (slugsInDatabase.length !== 1) throw new Error("CA:009");
      //Check friend relationship exist and request has been sent
      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      const checkFriend = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      // console.log({ checkFriend });
      if (!checkFriend) throw new Error("CA:010")
      if (checkFriend._blockRequest !== receiverSlug) throw new Error("CA:011")
      //Update friend document
      const updateDoc = { $set: { isBlock: false, _blockRequest: null } }
      const { modifiedCount } = await db
        .collection(collectionNames.friends)
        .updateOne(checkFriendQuery, updateDoc, { session });
      console.log(`${modifiedCount} document(s) was/were updated in the friends collection`)
      finalResult.message = `${receiverSlug} removed block ${senderSlug} successful`
      //Create success logs
      saveLog(ticket, args, chat_friend_block_remove.name, "success", finalResult.message, clientIp)
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
    saveLog(ticket, args, chat_friend_block_remove.name, "error", errorResult, clientIp)

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

export { chat_friend_block_remove };
