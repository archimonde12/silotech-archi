import { ObjectId } from "mongodb";
import { Member, MemberInMongo, MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_join = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM JOIN=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { roomId } = args;
  const objectRoomId = new ObjectId(roomId);
  //Check arguments
  if (!token || !roomId) throw new Error("all arguments must be provided");
  if (!roomId.trim()) throw new Error("roomId must be provided");
  //Verify token and get slug
  const newMemberSlug = await getSlugByToken(token);
  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {
    //Check roomId exist
    const RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session);
    //Check newMemberSlug exist
    const checkSlug = await db
      .collection(collectionNames.users)
      .findOne({ slug: newMemberSlug }, { session });
    console.log({ checkSlug });
    if (!checkSlug) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${newMemberSlug} not exist in user database`);
    }
    //Check block
    const blockMemberData = await db
      .collection(collectionNames.blockMembers)
      .findOne(
        { $and: [{ roomId: objectRoomId }, { slug: newMemberSlug }] },
        { session }
      );
    console.log({ blockMemberData });
    if (blockMemberData) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${newMemberSlug} has been blocked`);
    }
    //Check member
    const memberData = await db
      .collection(collectionNames.members)
      .findOne(
        { $and: [{ roomId: objectRoomId }, { slug: newMemberSlug }] },
        { session }
      );
    console.log({ memberData });
    if (memberData) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${newMemberSlug} already a member`);
    }

    //Add new Member Doc
    const now = new Date();
    const insertNewMemberDoc: Member = {
      slug: newMemberSlug,
      roomId: objectRoomId,
      joinedAt: now,
      role: MemberRole.member.name,
    };
    const { insertedId } = await db
      .collection(collectionNames.members)
      .insertOne(insertNewMemberDoc, { session });
    console.log({ insertedId });
    //Update Room Doc
    if (insertedId) {
      await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: 1 } },
          { session }
        );
    }
    const dataResult: MemberInMongo = {
      ...insertNewMemberDoc,
      _id: insertedId,
    };
    await session.commitTransaction();
    session.endSession();
    const listenData = {
      roomKey: roomId.toString(),
      content: `${newMemberSlug} join this room`,
    };
    pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
    return {
      success: true,
      message: `join room success!`,
      data: dataResult,
    };
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};
export { chat_room_join };
