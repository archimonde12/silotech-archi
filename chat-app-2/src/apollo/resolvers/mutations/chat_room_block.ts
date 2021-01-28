import { getClientIp } from "@supercharge/request-ip/dist";
import { decorateWithLogger } from "apollo-server";
import { ObjectId } from "mongodb";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { RoomInMongo } from "../../../models/Room";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { checkRoomIdInMongoInMutation, checkUsersInDatabase, getSlugByToken, saveLog } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_block = async (
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
    saveLog(ticket, args, chat_room_block.name, "request", "received a request", clientIp)

    console.log("======ROOM BLOCK=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { roomId, blockMemberSlugs } = args;
    const objectRoomId = new ObjectId(roomId);
    const totalMemberBlock = blockMemberSlugs.length;

    //Check arguments
    if (!roomId || !roomId.trim()) throw new Error("CA:020")
    if (!blockMemberSlugs || blockMemberSlugs.length===0) throw new Error("CA:031");

    //Verify token
    const admin = await getSlugByToken(token);
    if (blockMemberSlugs.includes(admin))
      throw new Error("CA:032");
    let finalResult: ResultMessage = {
      message: '',
      data: null
    }
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the room collection')
        throw new Error("CA:16")
      }
      console.log('1 document was found in the room collection')
      //Check master in blockMembers
      if (blockMemberSlugs.includes(RoomData.createdBy.slug)) throw new Error("CA:34")
      //Check room type
      if (RoomData.type === `global`) throw new Error("This is global room!you can do anything")
      //Check blockMembers exist
      let slugsInDatabase = await checkUsersInDatabase(blockMemberSlugs, session)
      if (slugsInDatabase.length !== blockMemberSlugs.length) throw new Error("CA:010")
      //Check member
      const checkOldMembersArray = [...blockMemberSlugs, admin];
      const checkOldMemFilter = {
        $and: [{ roomId: objectRoomId }, { slug: { $in: checkOldMembersArray } }],
      };
      const checkOldMembers = await db
        .collection(collectionNames.members)
        .find(checkOldMemFilter, { session })
        .toArray();
      console.log(`${checkOldMembers.length} member document(s) was/were found in the members collection`);
      if (checkOldMembers.length !== checkOldMembersArray.length) throw new Error("CA:010")

      //Check admin role
      const blockMemberData = checkOldMembers.filter(
        (member) => member.slug !== admin
      );
      // console.log({ blockMemberData });
      const adminData = checkOldMembers.filter(
        (member) => member.slug === admin
      )[0];
      // console.log({ adminData });
      const isAdminInBlockMembers: boolean = !blockMemberData.every(
        (member) => member.role === MemberRole.member.name
      );
      console.log({ isAdminInBlockMembers });
      if (isAdminInBlockMembers && adminData.role !== MemberRole.master.name) throw new Error("CA:035")
      if (adminData.role === MemberRole.member.name) throw new Error("CA:042")

      //Remove member doc
      const deleteQuery = {
        $and: [{ roomId: objectRoomId }, { slug: { $in: blockMemberSlugs } }],
      };
      let { deletedCount } = await db
        .collection(collectionNames.members)
        .deleteMany(deleteQuery, { session });
      console.log(`${deletedCount} doc(s) was/were deleted in the members collection`)
      //Update room doc
      if (!deletedCount) {
        throw new Error("CA:004")
      }
      const updateRoomRes = await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: -deletedCount } },
          { session }
        );
      console.log(`${updateRoomRes.modifiedCount} doc(s) was/were updated in the rooms collection`)
      //Add block member
      const insertBlockMemberDocs = blockMemberSlugs.map((slug) => ({
        slug,
        roomId: objectRoomId,
      }));
      const insertRes = await db
        .collection(collectionNames.blockMembers)
        .insertMany(insertBlockMemberDocs, { session });
      console.log(`${insertRes.insertedCount} doc(s) was/were inserted to the blockMembers collection`);

      const listenData = {
        roomId: roomId.toString(),
        content: `${blockMemberSlugs} has been block`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult.message = `${totalMemberBlock} member(s) has been block!`
      //Create success logs
      saveLog(ticket, args, chat_room_block.name, "success", finalResult.message, clientIp)
    }, transactionOptions)
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
    saveLog(ticket, args, chat_room_block.name, "error", errorResult, clientIp)


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
export { chat_room_block };
