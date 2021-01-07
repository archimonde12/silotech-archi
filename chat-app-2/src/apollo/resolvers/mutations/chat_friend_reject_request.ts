import { FriendInMongo } from "../../../models/Friend";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { createCheckFriendQuery, getSlugByToken } from "../../../ulti";

const chat_friend_reject_request = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======FRIEND REJECT REQUEST=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { senderSlug } = args;
  //Check arguments
  if (!senderSlug || !senderSlug.trim())
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
      //Check friend relationship exist and request has been sent
      const checkFriendQuery = createCheckFriendQuery(senderSlug, receiverSlug)
      const checkFriend: FriendInMongo | null = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      // console.log({ checkFriend });
      //Check friendRelationship exist| isFriend | isBlock | friendRestFrom
      if (!checkFriend) {
        console.log("0 document was found in friends collection")
        await session.abortTransaction();
        finalResult.message = `Reject fail! friend relationship not exist in friends collection`
        return
      }
      if (checkFriend.isFriend) {
        console.log("1 document was found in friends collection")
        await session.abortTransaction();
        finalResult.message = `Reject fail! ${senderSlug} and ${receiverSlug} already be friend`
        return
      }
      if (checkFriend.isBlock) {
        console.log("1 document was found in friends collection")
        await session.abortTransaction();
        finalResult.message = `Reject fail!, ${senderSlug} and ${receiverSlug}'s friend relationship has been blocked`
        return
      }
      if (checkFriend._friendRequestFrom !== senderSlug) {
        console.log("1 document was found in friends collection")
        await session.abortTransaction();
        finalResult.message = `Reject fail!, ${senderSlug} did not send request to ${receiverSlug}`
        return
      }
      //Update friend document
      const updateDoc = { $set: { _friendRequestFrom: null } };
      const { modifiedCount } = await db
        .collection(collectionNames.friends)
        .updateOne(checkFriendQuery, updateDoc, { session });
      console.log(`${modifiedCount} document(s) was/were updated in friends collection to include the friend request from`)
      finalResult.success=true
      finalResult.message = `${receiverSlug} reject ${senderSlug}'s friend request!`
    }, transactionOptions)
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully commit.");
    }
    session.endSession()
    return finalResult
  } catch (e) {
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected Error: ${e}`
    }
  }
};
export { chat_friend_reject_request };
