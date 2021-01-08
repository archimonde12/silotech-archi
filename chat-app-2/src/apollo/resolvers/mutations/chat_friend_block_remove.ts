import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { checkUsersInDatabase, createCheckFriendQuery, getSlugByToken } from "../../../ulti";

const chat_friend_block_remove = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======FRIEND BLOCK REMOVE=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { senderSlug } = args;
  //Check arguments
  if (!token || !senderSlug || !senderSlug.trim() || !token.trim())
    throw new Error("all arguments must be provided");
  //Start transaction
  const session = client.startSession();
  try {
    //Verify token and get slug
    const receiverSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      success: false,
      message: '',
      data: null
    }
    const transactionResults: any = await session.withTransaction(async () => {
      //Check senderSlug exist in database
      let slugsInDatabase = await checkUsersInDatabase([senderSlug], session)
      if (slugsInDatabase.length !== 1) {
        await session.abortTransaction();
        finalResult.message = `[${senderSlug}] is not exist in database!`
        return
      }
      //Check friend relationship exist and request has been sent
      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      const checkFriend = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      // console.log({ checkFriend });
      if (!checkFriend) {
        await session.abortTransaction();
        finalResult.message = "Remove block fail! do not exist friendship in the friends collection"
        return
      }
      if (checkFriend._blockRequest !== receiverSlug) {
        await session.abortTransaction();
        finalResult.message = `remove block fail! ${receiverSlug} do not block ${senderSlug}!`
        return
      }
      //Update friend document
      const updateDoc = { $set: { isBlock: false, _blockRequest: null } }
      const { modifiedCount } = await db
        .collection(collectionNames.friends)
        .updateOne(checkFriendQuery, updateDoc, { session });
      console.log(`${modifiedCount} document(s) was/were updated in the friends collection`)
      finalResult.success=true
      finalResult.message = `${receiverSlug} removed block ${senderSlug}!`
    }, transactionOptions)
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");    
    } else {
      console.log("The transaction was successfully committed.");
    }
    session.endSession()
    return finalResult
  } catch (e) {
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected Error: ${e}`,
      data:null
    }
  }
};

export { chat_friend_block_remove };
