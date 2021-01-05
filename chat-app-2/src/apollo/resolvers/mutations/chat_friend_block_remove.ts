import { collectionNames, db, client } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const chat_friend_block_remove = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  const session = client.startSession();
  session.startTransaction();
  try {
    console.log("======FRIEND BLOCK REMOVE=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { senderSlug } = args;
    //Check arguments
    if (!token || !senderSlug || !senderSlug.trim() || !token.trim())
      throw new Error("all arguments must be provided");
    //Verify token and get slug
    const reciverSlug = await getSlugByToken(token);
    //Check sender and reciver exist in database
    const findUsersRes = await db
      .collection(collectionNames.users)
      .find({ slug: { $in: [senderSlug, reciverSlug] } })
      .toArray();
    console.log({ findUserResCount: findUsersRes.length });
    if (findUsersRes.length !== 2)
      throw new Error("someone not exist in database!");
    //Start transaction

    //Check friend relationship exist and request has been sent
    const checkFriendQuery = {
      slug1: senderSlug > reciverSlug ? senderSlug : reciverSlug,
      slug2: senderSlug <= reciverSlug ? senderSlug : reciverSlug,
    };
    const checkFriend = await db
      .collection(collectionNames.friends)
      .findOne(checkFriendQuery, { session });
    console.log({ checkFriend });
    if (!checkFriend) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("remove block fail! dont exist friendship in database");
    }
    if (!checkFriend._blockRequest.includes(reciverSlug)) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("remove block fail! you do not block him/her!");
    }

    const updateDoc =
      checkFriend._blockRequest.length === 1
        ? { $set: { isBlock: false }, $pull: { _blockRequest: reciverSlug } }
        : { $set: { isBlock: true }, $pull: { _blockRequest: reciverSlug } };
    const { modifiedCount } = await db
      .collection(collectionNames.friends)
      .updateOne(checkFriendQuery, updateDoc, { session });
    if (modifiedCount !== 1) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("update remove block request fail!");
    }
    await session.commitTransaction();
    await session.endSession();
    return {
      success: true,
      message: `${reciverSlug} removed block ${senderSlug}!`,
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

export { chat_friend_block_remove };
