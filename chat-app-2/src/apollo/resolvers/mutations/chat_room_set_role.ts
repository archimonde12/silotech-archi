import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { MemberInMongo, MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { RoomInMongo } from "../../../models/Room";
import {
  collectionNames,
  db,
  client,
  transactionOptions,
} from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { checkRoomIdInMongoInMutation, getSlugByToken, saveLog } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_set_role = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
  increaseTicketNo()
  //Start transaction
  const session = client.startSession();
  try {
    //Create request log
    saveLog(ticket, args, chat_room_set_role.name, "request", "received a request", clientIp)
    console.log("=====ROOM SET ROLE=====");

    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { roomId, memberSlug, roleSet } = args;
    const roleToSet =
      roleSet === "admin" ? MemberRole.admin.name : MemberRole.member.name;
    const objectRoomId = new ObjectId(roomId);

    //Check arguments
    if (!roomId || !roomId.trim()) throw new Error("CA:020");

    if (!memberSlug || !memberSlug.trim()) throw new Error("CA:057");

    if (!roleSet) throw new Error

    //Verify token and get slug
    const master = await getSlugByToken(token);
    if (master === memberSlug) throw new Error("CA:058")
    let finalResult: ResultMessage = {
      message: "",
      data: null,
    };
    //Check roomId exist
    const transactionResults: any = await session.withTransaction(async () => {
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the room collection')
        throw new Error("CA:016")
      }
      console.log('1 document was found in the room collection')
      //Check master
      if (master !== RoomData.createdBy.slug) throw new Error("CA:017")

      //Check member
      const checkOldMemFilter = {
        $and: [
          { roomId: objectRoomId },
          { slug: { $in: [master, memberSlug] } },
        ],
      };
      const checkOldMembers: MemberInMongo[] = await db
        .collection(collectionNames.members)
        .find(checkOldMemFilter, { session })
        .toArray();
      // console.log({ checkOldMembers });
      console.log(`${checkOldMembers.length}/2 document(s) was/were found in the members collection`)
      if (checkOldMembers.length !== 2) throw new Error("CA:056")
      const memberData: MemberInMongo = checkOldMembers.filter(
        (member) => member.slug === memberSlug
      )[0];

      //Update new change
      const updateRoleRes = await db
        .collection(collectionNames.members)
        .updateOne(
          { $and: [{ roomId: objectRoomId }, { slug: memberSlug }] },
          { $set: { role: roleToSet } },
          { session }
        );
      memberData.role = roleToSet
      console.log(`${updateRoleRes.modifiedCount} document was updated in the members collection. Field change = role`);
      const listenData = {
        roomId: roomId.toString(),
        content: `${memberSlug} became ${roleToSet}!`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        message: `${memberSlug} became ${roleToSet}!`,
        data: memberData,
      };
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    //Create success logs
    saveLog(ticket, args, chat_room_set_role.name, "success", finalResult.message, clientIp)
    return finalResult
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveLog(ticket, args, chat_room_set_role.name, "error", errorResult, clientIp)
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

export { chat_room_set_role };
