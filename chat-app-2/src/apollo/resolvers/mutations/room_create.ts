import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { Room, RoomInMongo } from "../../../models/Room";
import { client, collectionNames, db } from "../../../mongo";
import { checkSlugsExistInDatabase } from "../../../ulti";

const room_create = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM CREATE=====");
  //Get arguments
  console.log({ args });
  const { slug, title, startMemberSlugs, roomType } = args;

  //Check arguments
  if (!title.trim()) throw new Error("Title must be provided");
  if (!slug.trim()) throw new Error("Slug must be provided");

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

  //Check slug and member exist in database
  await checkSlugsExistInDatabase(checkSlugs);
  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {
    //Insert new room document
    const now = new Date();
    const insertRoomDoc: Room = {
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
      .insertOne(insertRoomDoc, { session });
    console.log(insertedId);

    //Insert member docs
    let insertMemberDocs = startMemberSlugs.map((slug) => ({
      slug,
      roomId: insertedId,
      joinedAt: now,
      role: MemberRole.member.name,
    }));
    insertMemberDocs.push({
      slug,
      roomId: insertedId,
      joinedAt: now,
      role: MemberRole.master.name,
    });
    console.log(insertMemberDocs);
    await db
      .collection(collectionNames.members)
      .insertMany(insertMemberDocs, { session });
    let dataResult: RoomInMongo = { ...insertRoomDoc, _id: insertedId };
    await session.commitTransaction();
    session.endSession();
    return {
      success: true,
      message: `create new room success!`,
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

export { room_create };
