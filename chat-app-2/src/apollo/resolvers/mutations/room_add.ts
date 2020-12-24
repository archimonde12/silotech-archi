import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";

const room_add = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM ADD=====");
  //Get arguments
  console.log({ args });
  const { master, roomId, addMemberSlugs } = args;
  const objectRoomId = new ObjectId(roomId);
  const totalAddMember=addMemberSlugs.length
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
    //Check room type
    if (RoomData.type === `inbox`) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Cannot add! Because this room is inboxRoom ");
    }
    if (RoomData.type === `global` && master !== ADMIN_KEY) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("wrong admin key!");
    }
    //Check master
    if (master !== RoomData.createdBy.slug) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${master} is not a master of this room`);
    }
    //Check addMemberSlugs exist
    let checkSlug = await db
      .collection(collectionNames.users)
      .find({ slug: {$in:addMemberSlugs} }).toArray();
    console.log({ checkSlug });
    if (checkSlug.length!==totalAddMember) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${totalAddMember-checkSlug.length} member(s) not exist in user database`);
    }
    //Check member
    let checkOldMembers=await db.collection(collectionNames.members).find({$and:[{roomId:objectRoomId},{slug:{$in:addMemberSlugs}}]}).toArray()
    console.log({checkOldMembers})
    if(checkOldMembers.length>0){
      await session.abortTransaction();
      session.endSession();
      throw new Error(`some one has already been a member`);
    }
    //Create new member doc
    const now = new Date();
    let insertMemberDocs = addMemberSlugs.map(memberSlug => ({
      slug: memberSlug,
      roomId: objectRoomId,
      joinedAt: now,
      role: MemberRole.member.id,
    }))
    let insertRes=await db.collection(collectionNames.members).insertMany(insertMemberDocs);
    console.log(insertRes)
    //Update room doc
    await db.collection(collectionNames.rooms).updateOne({_id:objectRoomId},{$inc:{totalMembers:totalAddMember}})
    await session.commitTransaction();
    session.endSession();
    return {
      success: true,
      message: `add ${totalAddMember} new member(s) success!`,
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
export { room_add };
