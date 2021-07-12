import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, Log, ticketNo } from "../../../models/Log";
import { MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { Room, RoomInMongo } from "../../../models/Room";
import {
  client,
  collectionNames,
  db,
  transactionOptions,
} from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { checkUsersInDatabase, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";

export const chat_api_user_room_create = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  //Start transaction
  const session = client.startSession();
  try {
    //Create request log
    saveRequestLog(ticket, args, chat_api_user_room_create.name, clientIp)
    console.log("======ROOM CREATE=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { title, startMemberSlugs, roomType } = args;
    //Check arguments
    if (!roomType) throw new Error("CA:064");
    if (!title || !title.trim()) throw new Error("CA:063");
    //Verify token and get slug
    const slug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: "",
      data: null,
    };
    await session.withTransaction(async () => {
      //Check conditions input
      let checkSlugs: any;
      switch (roomType) {
        case "global":
          throw new Error("CA:043")
        case "public":
          console.log({
            checkMasterInMembers: startMemberSlugs.includes(slug),
          });
          if (startMemberSlugs.includes(slug)) throw new Error("CA:038")
          checkSlugs = [...startMemberSlugs, slug];
          break;
        default:
          break;
      }
      //Check member exist in database
      let slugsInDatabase = await checkUsersInDatabase(checkSlugs, session);
      if (slugsInDatabase.length !== checkSlugs.length) throw new Error("CA:010")
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
      const { insertedId, insertedCount } = await db
        .collection(collectionNames.rooms)
        .insertOne(insertRoomDoc, { session });
      console.log(`${insertedCount} new document was inserted to rooms collection with _id=`, insertedId);

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
      const insertNewMemRes = await db
        .collection(collectionNames.members)
        .insertMany(insertMemberDocs, { session });
      console.log(`${insertNewMemRes.insertedCount} new document(s) was/were inserted to members collection`);
      const dataResult: RoomInMongo = { ...insertRoomDoc, _id: insertedId };

      finalResult.message = `create new room success!`;
      finalResult.data = dataResult;
      //Create success logs
      saveSuccessLog(ticket, args, chat_api_user_room_create.name, finalResult.message, clientIp)
    }, transactionOptions);

    return finalResult
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveErrorLog(ticket, args, chat_api_user_room_create.name, errorResult, clientIp)

    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.log("The transaction was aborted due to  " + e);
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      CaptureException(e, { args })
      throw new Error("CA:004")
    }
  } finally {
    session.endSession()
  }
};

