import { collectionNames, db, client } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const chat_friend_accept_request = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  //Start transaction
  const session = client.startSession();
  session.startTransaction();
  try {
    console.log("======FRIEND ACCEPT REQUEST=====");
    //Get arguments
    const token = ctx.req.headers.authorization;
    console.log({ args });
    const { senderSlug } = args;
    //Check arguments
    if (!token || !senderSlug || !senderSlug.trim())
      throw new Error("all arguments must be provided");
    //Verify token and get slug
    const reciverSlug = await getSlugByToken(token);
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
      throw new Error("Accept fail!");
    }
    //Update friend docments
    const now = new Date();
    const updateDoc = {
      $set: { _friendRequestFrom: null, isFriend: true, beFriendAt: now },
    };
    const { modifiedCount } = await db
      .collection(collectionNames.friends)
      .updateOne(checkFriendQuery, updateDoc, { session });
    if (modifiedCount !== 1) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("update accept request fail!");
    }
    await session.commitTransaction();
    await session.endSession();
    return {
      success: true,
      message: `${reciverSlug} and ${senderSlug} become friends`,
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
export { chat_friend_accept_request };
