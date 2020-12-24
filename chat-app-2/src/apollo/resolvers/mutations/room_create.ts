import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";

const room_create = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM CREATE=====");
  //Get arguments
  console.log({ args });
  const { slug, title, startMemberSlugs, roomType } = args;
  //Check conditions input
  let checkSlugs: any;
  switch (roomType) {
    case "global":
      if (slug !== ADMIN_KEY) {
        throw new Error("wrong admin key!");
      }
      checkSlugs = [...startMemberSlugs];
      break;
    case "public":
      console.log({ checkMasterInMembers: startMemberSlugs.includes(slug) });
      if (startMemberSlugs.includes(slug)) {
        throw new Error("Master cannot be member!");
      }
      checkSlugs = [...startMemberSlugs, slug];
      break;
    default:
      break;
  }
  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {
    //Check slug and member exist in database
    const findUsersRes = await db
      .collection(collectionNames.users)
      .find({ slug: { $in: checkSlugs } })
      .toArray();
    console.log({ findUserResCount: findUsersRes.length });
    if (findUsersRes.length === checkSlugs.length) {
      //Insert new room document
      const now = new Date();
      const insertRoomDoc = {
        title,
        createdBy: { slug },
        type: roomType,
        createdAt: now,
        updatedAt: now,
        totalMembers: checkSlugs.length,
        lastMess: null,
      };
      console.log({ insertRoomDoc });
      const { insertedId } = await db
        .collection(collectionNames.rooms)
        .insertOne(insertRoomDoc);
      console.log(insertedId);
      //Insert member docs
      let insertMemberDocs = startMemberSlugs.map((slug) => ({
        slug,
        roomId: insertedId,
        joinedAt: now,
        role: MemberRole.member.id,
      }));
      insertMemberDocs.push({
        slug,
        roomId: insertedId,
        joinedAt: now,
        role: MemberRole.master.id,
      });
      console.log(insertMemberDocs);
      await db.collection(collectionNames.members).insertMany(insertMemberDocs);
      let result = { ...insertRoomDoc, _id: insertedId };
      await session.commitTransaction();
      session.endSession();
      return {
        success: true,
        message: `create new room success!`,
        data: result,
      };
    }
    await session.abortTransaction();
    session.endSession();
    throw new Error("Have slug not exist in database!");
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};

export { room_create };
