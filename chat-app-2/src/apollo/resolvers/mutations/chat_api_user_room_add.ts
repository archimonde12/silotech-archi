import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { Member, MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { RoomInMongo } from "../../../models/Room";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { CaptureException } from "../../../sentry";
import { checkRoomIdInMongoInMutation, checkUsersInDatabase, getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

export const chat_api_user_room_add = async (root: any, args: any, ctx: any): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
  increaseTicketNo()
  //Start transaction
  const session = client.startSession();
  try {
    //Create request log
    saveRequestLog(ticket, args, chat_api_user_room_add.name, clientIp)
    console.log("======ROOM ADD=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { roomId, addMemberSlugs } = args;
    const objectRoomId = new ObjectId(roomId);
    const totalAddMember = addMemberSlugs.length;

    //Check arguments
    if (!roomId || !roomId.trim()) throw new Error("CA:020");
    if (!addMemberSlugs || addMemberSlugs.length === 0) throw new Error("CA:037");

    //Verify token and get slug
    const admin = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: '',
      data: null
    }
    if (addMemberSlugs.includes(admin)) throw new Error("CA:038");

     await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the room collection')
        throw new Error("CA:016")
      }
      console.log('1 document was found in the room collection')
      //Check room type
      if (RoomData.type === `global`) throw new Error("CA:039");

      //Check addMemberSlugs exist
      let slugsInDatabase = await checkUsersInDatabase(addMemberSlugs, session)
      if (slugsInDatabase.length !== addMemberSlugs.length) throw new Error("CA:010")
      //Check member
      const checkOldMembersArray = [...addMemberSlugs, admin];
      const checkOldMembers = await db
        .collection(collectionNames.members)
        .find(
          {
            $and: [
              { roomId: objectRoomId },
              { slug: { $in: checkOldMembersArray } },
            ],
          },
          { session }
        )
        .toArray();
      console.log(`${checkOldMembers.length} member document(s) was/were found in the members collection`);
      if (checkOldMembers.length > 1) throw new Error("CA:040")
      //Check block
      const checkBlockMembers = await db
        .collection(collectionNames.blockMembers)
        .find(
          {
            $and: [
              { roomId: objectRoomId },
              { slug: { $in: checkOldMembersArray } },
            ],
          },
          { session }
        )
        .toArray();
      console.log(`${checkBlockMembers.length} block member document(s) was/were found in the blockMembers collection`);
      if (checkBlockMembers.length > 0) throw new Error("CA:041")
      //Check admin role
      if (
        !checkOldMembers[0] ||
        checkOldMembers[0].role === MemberRole.member.name
      ) throw new Error("CA:042")
      //Create new member doc
      const now = new Date();
      let insertMemberDocs: Member[] = addMemberSlugs.map((memberSlug) => ({
        slug: memberSlug,
        roomId: objectRoomId,
        joinedAt: now,
        role: MemberRole.member.name,
      }));
      const insertRes = await db
        .collection(collectionNames.members)
        .insertMany(insertMemberDocs, { session });
      console.log(`${insertRes.insertedCount} new member document(s) was/were inserted in the Members collection`)
      //Update room doc
      const { modifiedCount } = await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: totalAddMember } },
          { session }
        );
      console.log(`${modifiedCount} document(s) was/were updated in rooms collection to include adding new member`)
      const listenData = {
        roomId: roomId.toString(),
        content: `${addMemberSlugs} has been added`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        message: `add ${totalAddMember} new member(s) success!`,
        data: null,
      };
    }, transactionOptions)
    //Create success logs
    saveSuccessLog(ticket, args, chat_api_user_room_add.name, finalResult.message, clientIp)
   
    return finalResult
  } catch (e) {
      //Create error logs
      const errorResult = JSON.stringify({
        name: e.name,
        message: e.message,
        stack: e.stack
      })
      saveErrorLog(ticket, args, chat_api_user_room_add.name, errorResult, clientIp)
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.log("The transaction was aborted due to " + e);
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
