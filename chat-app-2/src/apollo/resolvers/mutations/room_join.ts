import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";

const room_join = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM JOIN=====");
  //Get arguments
  console.log({ args });
  const { newMemberSlug, roomId } = args;
  const objectRoomId = new ObjectId(roomId);
  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {
    //Check roomId exist
    let RoomData = await db
      .collection(collectionNames.rooms)
      .findOne({ _id: objectRoomId });
    console.log({ RoomData });
    if (!RoomData) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("RoomId not exist");
    }
    //Check newMemberSlug exist
    let checkSlug = await db
      .collection(collectionNames.users)
      .findOne({ slug: newMemberSlug });
    console.log({ checkSlug });
    if (!checkSlug) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${newMemberSlug} not exist in user database`);
    }
    //Check room type
    if (RoomData.type === `inbox`) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Cannot join! Because this room is inboxRoom ");
    }
    //Check member
    let memberData = await db
      .collection(collectionNames.members)
      .findOne({ $and: [{ roomId: objectRoomId }, { slug: newMemberSlug }] });
    console.log({ memberData });
    if (memberData) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${newMemberSlug} already a member`);
    }
    //Add new Member Doc
    const now = new Date();
    const insertNewMemberDoc = {
      slug: newMemberSlug,
      roomId: objectRoomId,
      joinedAt: now,
      role: MemberRole.member.id,
    };
    const { insertedId } = await db
      .collection(collectionNames.members)
      .insertOne(insertNewMemberDoc);
    console.log({ insertedId });
    //Update Room Doc
    if (insertedId) {
      await db
        .collection(collectionNames.rooms)
        .updateOne({ _id: objectRoomId }, { $inc: { totalMembers: 1 } });
    }
    await session.commitTransaction();
    session.endSession();
    return {
      success: true,
      message: `join room success!`,
      data: insertNewMemberDoc,
    };
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};
export { room_join };
