import { collectionNames, db, client } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

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
  if (!token || !senderSlug || !senderSlug.trim() || !token.trim())
    throw new Error("all arguments must be provided");
  //Verify token and get slug
  const reciverSlug = await getSlugByToken(token);
  //Start transaction
  const session = client.startSession();
  session.startTransaction();
  try {
    //Check friend relationship exist and request has been sent
    const checkFriendQuery = {
      slug1: senderSlug > reciverSlug ? senderSlug : reciverSlug,
      slug2: senderSlug <= reciverSlug ? senderSlug : reciverSlug,
    };
    const checkFriend = await db
      .collection(collectionNames.friends)
      .findOne(checkFriendQuery, { session });
    console.log({ checkFriend });
    //Check friendRelationship exist| isFriend | isBlock | friendRestFrom
    if (
      !checkFriend ||
      checkFriend.isFriend ||
      checkFriend.isBlock ||
      checkFriend._friendRequestFrom !== senderSlug
    ) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Reject fail!");
    }
    //Update friend docments
    const updateDoc = { $set: { _friendRequestFrom: null } };
    const { modifiedCount } = await db
      .collection(collectionNames.friends)
      .updateOne(checkFriendQuery, updateDoc, { session });
    if (modifiedCount !== 1) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("update reject request fail!");
    }
    await session.commitTransaction();
    await session.endSession();
    return {
      success: true,
      message: `${reciverSlug} reject ${senderSlug}'s friend request!`,
      data: null,
    };
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};
export { chat_friend_reject_request };