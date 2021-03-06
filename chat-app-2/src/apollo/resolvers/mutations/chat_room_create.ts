import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { Room, RoomInMongo } from "../../../models/Room";
import {
  client,
  collectionNames,
  db,
  transactionOptions,
} from "../../../mongo";
import { checkUsersInDatabase, getSlugByToken } from "../../../ulti";

const chat_room_create = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======ROOM CREATE=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { title, startMemberSlugs, roomType } = args;
  //Check arguments
  if (!token || !title || !roomType)
    throw new Error("all arguments must be provided");
  if (!title.trim()) throw new Error("Title must be provided");
  //Start transcation
  const session = client.startSession();
  try {
    //Verify token and get slug
    const slug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: "",
      data: null,
    };
    const transactionResults: any = await session.withTransaction(async () => {
      //Check conditions input
      let checkSlugs: any;
      switch (roomType) {
        case "global":
          if (slug !== ADMIN_KEY) {
            await session.abortTransaction();
            finalResult.message = "wrong admin key!";
            return;
          }
          checkSlugs = [...startMemberSlugs];
          break;
        case "public":
          console.log({
            checkMasterInMembers: startMemberSlugs.includes(slug),
          });
          if (startMemberSlugs.includes(slug)) {
            await session.abortTransaction();
            finalResult.message = "Master cannot be member!";
            return;
          }
          checkSlugs = [...startMemberSlugs, slug];
          break;
        default:
          break;
      }
      //Check member exist in database
      let slugsInDatabase = await checkUsersInDatabase(checkSlugs, session);
      if (slugsInDatabase.length !== checkSlugs.length) {
        await session.abortTransaction();
        finalResult.message = `${checkSlugs.filter(
          (slug) => !slugsInDatabase.includes(slug)
        )} is/are not exist in database!`;
        return;
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
      // console.log({ insertRoomDoc });
      const { insertedId,insertedCount } = await db
        .collection(collectionNames.rooms)
        .insertOne(insertRoomDoc, { session });
      console.log(`${insertedCount} new document was inserted to rooms collection with _id=`,insertedId);

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
      //console.log(insertMemberDocs);
      const insertNewMemRes=await db
        .collection(collectionNames.members)
        .insertMany(insertMemberDocs, { session });
        console.log(`${insertNewMemRes.insertedCount} new document(s) was/were inserted to members collection`);
      const dataResult: RoomInMongo = { ...insertRoomDoc, _id: insertedId };
      finalResult.message = `create new room success!`;
      finalResult.data = dataResult;
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    session.endSession();
    return finalResult;
  } catch (e) {
    await session.abortTransaction();
    console.log("The transaction was aborted due to : " + e);
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      throw new Error("CA:004")
    }
  }
};

export { chat_room_create };
