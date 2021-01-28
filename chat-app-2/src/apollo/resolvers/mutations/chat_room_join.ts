import { getClientIp } from "@supercharge/request-ip/dist";
import { ObjectId } from "mongodb";
import { BlockMemberInMongo } from "../../../models/BlockMember";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { Member, MemberInMongo, MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { RoomInMongo } from "../../../models/Room";
import { UserInMongo } from "../../../models/User";
import {
  client,
  collectionNames,
  db,
  transactionOptions,
} from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { checkRoomIdInMongoInMutation, getSlugByToken, saveLog } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_join = async (root: any, args: any, ctx: any): Promise<any> => {
  const clientIp = getClientIp(ctx.req)
  const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknow"}`
  increaseTicketNo()
  //Start transcation
  const session = client.startSession();
  try {
    //Create request log
    saveLog(ticket, args, chat_room_join.name, "request", "received a request", clientIp)

    console.log("======ROOM JOIN=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { roomId } = args;
    const objectRoomId = new ObjectId(roomId);
    //Check arguments
    if (!roomId.trim() || !roomId) throw new Error("CA:020");
    //Verify token and get slug
    const newMemberSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: "",
      data: null,
    };
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the room collection')
        throw new Error("CA:016")
      }
      console.log('1 document was found in the room collection')

      //Check block
      const blockMemberData: BlockMemberInMongo | null = await db
        .collection(collectionNames.blockMembers)
        .findOne(
          { $and: [{ roomId: objectRoomId }, { slug: newMemberSlug }] },
          { session }
        );
      // console.log({ blockMemberData });
      if (blockMemberData) {
        console.log(`1 document was found in the blockMembers collection`)
        throw new Error("CA:045")
      }
      console.log(`0 document was found in the blockMembers collection`)
      //Check member
      const memberData = await db
        .collection(collectionNames.members)
        .findOne(
          { $and: [{ roomId: objectRoomId }, { slug: newMemberSlug }] },
          { session }
        );
      // console.log({ memberData });
      if (memberData) {
        console.log(`1 document was found in the members collection`)
        throw new Error("CA:065")
      }
      console.log(`0 document was found in the members collection`)
      //Add new Member Doc
      const now = new Date();
      const insertNewMemberDoc: Member = {
        slug: newMemberSlug,
        roomId: objectRoomId,
        joinedAt: now,
        role: MemberRole.member.name,
      };
      const { insertedId, insertedCount } = await db
        .collection(collectionNames.members)
        .insertOne(insertNewMemberDoc, { session });
      console.log(`${insertedCount} member document was inserted to the members collection with _id=${insertedId}`);
      //Update Room Doc

      const { modifiedCount } = await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: 1 } },
          { session }
        );
      console.log(`${modifiedCount} document was updated in the room collection. Field change = totalMembers`)
      const dataResult: MemberInMongo = {
        ...insertNewMemberDoc,
        _id: insertedId,
      };
      const listenData = {
        roomId: roomId.toString(),
        content: `${newMemberSlug} join this room`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        message: `join room success!`,
        data: dataResult,
      };
      //Create success logs
      saveLog(ticket, args, chat_room_join.name, "success", finalResult.message, clientIp)
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    return finalResult
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveLog(ticket, args, chat_room_join.name, "error", errorResult, clientIp)
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
export { chat_room_join };
