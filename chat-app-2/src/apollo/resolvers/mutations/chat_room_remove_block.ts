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

const chat_room_remove_block = async (
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
    saveLog(ticket, args, chat_room_remove_block.name, "request", "received a request", clientIp)
    console.log("======ROOM REMOVE BLOCK=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { roomId, blockMemberSlug } = args;
    const objectRoomId = new ObjectId(roomId);
    //Check arguments
    if (!roomId || !roomId.trim()) throw new Error("CA:020")

    if (!blockMemberSlug || !blockMemberSlug.trim()) throw new Error("CA:031");

    //Verify token and get slug
    const admin = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: "",
      data: null,
    };
    if (blockMemberSlug.trim() === admin.trim()) throw new Error("CA:047")

    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the rooms collection')
        throw new Error("CA:016")
      }
      console.log('1 document was found in the rooms collection')
      //Check admin role
      const adminData = await db
        .collection(collectionNames.members)
        .findOne({ $and: [{ slug: admin }, { roomId: objectRoomId }] });

      if (!adminData) {
        console.log('0 member document was found in the members collection')
        await session.abortTransaction();
        finalResult.message = `${admin} is not a member of this room`;
        return;
      }
      console.log('1 member document was found in the members collection')
      if (adminData.role === MemberRole.member.name) throw new Error("CA:048")

      //Remove blockMemberSlug in blocklist
      const blockMemberDeleteRes = await db
        .collection(collectionNames.blockMembers)
        .deleteOne({
          $and: [{ slug: blockMemberSlug }, { roomId: objectRoomId }],
        });
      console.log(`${blockMemberDeleteRes.deletedCount} document was deleted in the blockMembers collection`)
      if (blockMemberDeleteRes.deletedCount === 0) throw new Error("CA:049")
      finalResult = {
        message: `${blockMemberSlug} has been remove from block list!`,
        data: null,
      };
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    //Create success logs
    saveLog(ticket, args, chat_room_remove_block.name, "success", finalResult.message, clientIp)
    return finalResult
  } catch (e) {
    //Create error logs
    const errorResult = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack
    })
    saveLog(ticket, args, chat_room_remove_block.name, "error", errorResult, clientIp)
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

export { chat_room_remove_block };
