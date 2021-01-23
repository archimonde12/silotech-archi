import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { checkUsersInDatabase, createCheckFriendQuery, getSlugByToken } from "../../../ulti";

const chat_friend_block_remove = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  //Start transaction
  const session = client.startSession();
  try {
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
};

export { chat_friend_block_remove };
