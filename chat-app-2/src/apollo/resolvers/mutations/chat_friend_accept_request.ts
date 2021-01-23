import { FriendInMongo } from "../../../models/Friend";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { createCheckFriendQuery, getSlugByToken } from "../../../ulti";

const chat_friend_accept_request = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  //Start transaction
  const session = client.startSession();
  try {
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
      if (!checkFriendRelationShip) throw new Error('CA:006')
      if (checkFriendRelationShip._friendRequestFrom !== senderSlug) throw new Error('CA:007')
      if (checkFriendRelationShip.isBlock) throw new Error('CA:005')
      if (checkFriendRelationShip.isFriend) throw new Error('CA:004')

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
    }, transactionOptions)
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    session.endSession()
    return finalResult
  } catch (e) {
    await session.abortTransaction();
    console.log("The transaction was aborted due to : " + e);
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      throw new Error("CA:004")
    }
  }

}

export { chat_friend_accept_request };