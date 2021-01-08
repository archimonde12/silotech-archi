import { Friend, FriendInMongo } from "../../../models/Friend";
import { ResultMessage } from "../../../models/ResultMessage";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { checkUsersInDatabase, createCheckFriendQuery, getSlugByToken } from "../../../ulti";

const chat_friend_send_request = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======FRIEND REQUEST SEND=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { receiverSlug } = args;
  //Check arguments
  if (!receiverSlug || !receiverSlug.trim())
    throw new Error("all arguments must be provided");

  //Start transaction
  const session = client.startSession();
  try {
    //Verify token and get slug
    const senderSlug = await getSlugByToken(token);
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
      if (checkFriend) {
        console.log("1 document was found in friends collection");
        //Check is Friend
        if (checkFriend.isFriend) {
          await session.abortTransaction();
          finalResult.message = `${senderSlug} and ${receiverSlug} already be friend!`;
          return;
        }
        //Check block
        if (checkFriend.isBlock) {
          await session.abortTransaction();
          finalResult.message = `Can not sent request because this friend relationship has been block`;
          return;
        }
        //Check friend request from
        if (checkFriend._friendRequestFrom !== null) {
          await session.abortTransaction();
          finalResult.message = `${checkFriend._friendRequestFrom} already sent request!`;
          return;
        }
        //update friend document
        const updateRes = await db
          .collection(collectionNames.friends)
          .updateOne(
            checkFriendQuery,
            { $set: { _friendRequestFrom: senderSlug } },
            { session }
          );
        console.log(`${updateRes.modifiedCount} document(s) was/were updated in friends collection to include the friend request from`)
        finalResult.success=true
        finalResult.message = `${senderSlug} sent a friend request to ${receiverSlug}`
        return
      }
      console.log("0 document was found in friends collection");
      //Create new friend document
      const now = new Date();
      const checkSlugs = [senderSlug, receiverSlug];
      //Check sender and receiver exist in database
      const slugsInDatabase = await checkUsersInDatabase(checkSlugs, session)
      if (slugsInDatabase.length !== 2) {
        await session.abortTransaction();
        finalResult.message = `${checkSlugs.filter(user => !slugsInDatabase.includes(user))} is not exist in database!`
        return
      }
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
      finalResult.success=true
      finalResult.message=`${senderSlug} sent a friend request ${receiverSlug}!`
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
export { chat_friend_send_request };
