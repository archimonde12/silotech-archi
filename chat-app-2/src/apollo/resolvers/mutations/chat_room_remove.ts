import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { RoomInMongo } from "../../../models/Room";
import {
  client,
  collectionNames,
  db,
  transactionOptions,
} from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { checkRoomIdInMongoInMutation, getSlugByToken, saveLog } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";


const chat_room_remove = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
  increaseTicketNo()
  //Start transcation
  const session = client.startSession();
  try {
    //Create request log
    saveLog(ticket, args, chat_room_remove.name, "request", "received a request", clientIp)
    console.log("======ROOM REMOVE=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { roomId, removeMemberSlugs } = args;
    const objectRoomId = new ObjectId(roomId);
    const totalMemberRemove = removeMemberSlugs.length;
    //Check arguments
    if (!roomId || !roomId.trim()) throw new Error("CA:020")
    if (!removeMemberSlugs || removeMemberSlugs.length === 0) throw new Error("CA:050");
    //Verify token and get slug
    const admin = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: "",
      data: null,
    };
    if (removeMemberSlugs.includes(admin)) throw new Error("CA:051");

    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the room collection')
        throw new Error("CA:016")
      }
      console.log('1 document was found in the rooms collection')
      //Check master in removeMembers
      if (removeMemberSlugs.includes(RoomData.createdBy.slug)) throw new Error("CA:052")

      //Check room type
      if (RoomData.type === `global`) throw new Error("CA:053")

      //Check member
      const checkOldMembersArray = [...removeMemberSlugs, admin];
      const checkOldMemFilter = {
        $and: [
          { roomId: objectRoomId },
          { slug: { $in: checkOldMembersArray } },
        ],
      };
      const checkOldMembers = await db
        .collection(collectionNames.members)
        .find(checkOldMemFilter, { session })
        .toArray();
      // console.log({ checkOldMembers });
      console.log(`${checkOldMembers.length}/${checkOldMembersArray.length} document(s) was/were found in the members collection`)
      if (checkOldMembers.length !== checkOldMembersArray.length) throw new Error("CA:054")

      //Check admin role
      const removeMemberData = checkOldMembers.filter(
        (member) => member.slug !== admin
      );
      // console.log({ removeMemberData });
      const adminData = checkOldMembers.filter(
        (member) => member.slug === admin
      )[0];
      // console.log({ adminData });
      const isAdminInRemoveMember: boolean = !removeMemberData.every(
        (member) => member.role === MemberRole.member.name
      );
      // console.log({ isAdminInRemoveMember });
      if (isAdminInRemoveMember && adminData.role !== MemberRole.master.name) throw new Error("CA:055")
      if (adminData.role === MemberRole.member.name) throw new Error("CA:042")

      //Remove member doc
      const deleteQuery = {
        $and: [{ roomId: objectRoomId }, { slug: { $in: removeMemberSlugs } }],
      };
      const { deletedCount } = await db
        .collection(collectionNames.members)
        .deleteMany(deleteQuery, { session });
      console.log(`${deletedCount} document(s) was/were deleted in members collection`)
      //Update room doc
      if (deletedCount === 0 || !deletedCount) throw new Error("CA:036")
      const { modifiedCount } = await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: -deletedCount } },
          { session }
        );
      console.log(`${modifiedCount} document(s) was/were updated in rooms collection. Field change ="totalMembers"`)
      const listenData = {
        roomId: roomId.toString(),
        content: `${removeMemberSlugs} has been kick out this room`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        message: `${totalMemberRemove} member(s) has been removed!`,
        data: null,
      };
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    //Create success logs
    saveLog(ticket, args, chat_room_remove.name, "success", finalResult.message, clientIp)
    return finalResult
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveLog(ticket, args, chat_room_remove.name, "error", errorResult, clientIp)
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.log("The transaction was aborted due to " + e);
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      captureExeption(e, { args })
      throw new Error("CA:004")
    }
  } finally {
    session.endSession()
  }
};
export { chat_room_remove };
