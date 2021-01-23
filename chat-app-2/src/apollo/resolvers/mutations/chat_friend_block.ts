import { Friend, FriendInMongo } from "../../../models/Friend";
import { ResultMessage } from "../../../models/ResultMessage";
import { collectionNames, db, client, transactionOptions } from "../../../mongo";
import { checkUsersInDatabase, createCheckFriendQuery, getSlugByToken } from "../../../ulti";

const chat_friend_block = async (root: any,
  args: any,
  ctx: any): Promise<any> => {
      //Start transaction
  const session = client.startSession();
  try {
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
export { chat_friend_block };
