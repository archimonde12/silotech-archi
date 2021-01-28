import { getClientIp } from "@supercharge/request-ip/dist";
import { FriendInMongo } from "../../../models/Friend";
import { increaseTicketNo, Log, ticketNo } from "../../../models/Log";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { createCheckFriendQuery, getSlugByToken, saveLog } from "../../../ulti";

const chat_friend_accept_request = async (
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
    saveLog(ticket, args, chat_friend_accept_request.name, "request", "received a request", clientIp)
    console.log("======FRIEND ACCEPT REQUEST=====")
    //Get arguments
    const token = ctx.req.headers.authorization;
    // console.log({ args });
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
      //Check friend relationship exist and request has been sent
      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      // console.log({ checkFriendQuery })
      const checkFriendRelationShip: FriendInMongo | null = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      // console.log({ checkFriendRelationShip });

      //Check friendRelationship exist| isFriend | isBlock | friendRestFrom
      if (!checkFriendRelationShip) throw new Error('CA:007')
      if (checkFriendRelationShip.isFriend) throw new Error('CA:005')
      if (checkFriendRelationShip.isBlock) throw new Error('CA:006')
      if (checkFriendRelationShip._friendRequestFrom !== senderSlug) throw new Error('CA:008')
      if (checkFriendRelationShip._friendRequestFrom === null) throw new Error('CA:033')
   
      console.log(`1 document was found in the friends collection`)
      //Update friend docments
      const now = new Date();
      const updateDoc = {
        $set: { _friendRequestFrom: null, isFriend: true, beFriendAt: now },
      };
      const { modifiedCount } = await db
        .collection(collectionNames.friends)
        .updateOne(checkFriendQuery, updateDoc, { session });
      console.log(`${modifiedCount} document(s) was/were updated in the friends collection`)
      finalResult.message = `${receiverSlug} and ${senderSlug} become friends`
      //Create success logs
      saveLog(ticket, args, chat_friend_accept_request.name, "success", finalResult.message, clientIp)
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
    saveLog(ticket, args, chat_friend_accept_request.name, "error", errorResult, clientIp)

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

export { chat_friend_accept_request };