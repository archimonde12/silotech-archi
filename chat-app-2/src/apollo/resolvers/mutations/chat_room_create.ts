import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { Room, RoomInMongo } from "../../../models/Room";
import { client, collectionNames, db } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const chat_room_create = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {
    console.log("======ROOM CREATE=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { title, startMemberSlugs, roomType } = args;
    //Check arguments
    if (!token || !title || !roomType)
      throw new Error("all arguments must be provided");
    if (!title.trim()) throw new Error("Title must be provided");
    //Verify token and get slug
    const slug = await getSlugByToken(token);
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
    const findUsersRes = await db
      .collection(collectionNames.users)
      .find({ slug: { $in: checkSlugs } })
      .toArray();
    console.log({ findUserResCount: findUsersRes.length });
    if (findUsersRes.length !== checkSlugs.length) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Have slug not exist in database!");
    }

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
    const insertMemberDocs = startMemberSlugs.map((slug) => ({
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
    const dataResult: RoomInMongo = { ...insertRoomDoc, _id: insertedId };
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

export { chat_room_create };