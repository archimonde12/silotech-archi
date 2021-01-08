import { FriendInMongo } from "../../../models/Friend";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { createCheckFriendQuery, getSlugByToken } from "../../../ulti";

const chat_friend_accept_request = async (root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======FRIEND ACCEPT REQUEST=====")
  //Get arguments
  const token = ctx.req.headers.authorization;
  console.log({ args });
  const { senderSlug } = args;
  //Check arguments
  if (!senderSlug || !senderSlug.trim())
    throw new Error("senderSlug must be provided");
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
      // console.log({ checkFriendQuery })
      const checkFriendRelationShip: FriendInMongo | null = await db
        .collection(collectionNames.friends)
        .findOne(checkFriendQuery, { session });
      // console.log({ checkFriendRelationShip });
      //Check friendRelationship exist| isFriend | isBlock | friendRestFrom
      if (
        !checkFriendRelationShip ||
        checkFriendRelationShip.isFriend ||
        checkFriendRelationShip.isBlock ||
        checkFriendRelationShip._friendRequestFrom !== senderSlug
      ) {
        await session.abortTransaction();
        finalResult.message = 'Accept fail! Reason: Already friend | Block | Already receive friend request | Friend Request not exist'
        return
      }
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
      finalResult.success = true
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
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected Error: ${e}`,
      data: null
    }
  }

}

export { chat_friend_accept_request };