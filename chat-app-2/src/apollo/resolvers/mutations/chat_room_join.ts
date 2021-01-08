import { ObjectId } from "mongodb";
import { BlockMemberInMongo } from "../../../models/BlockMember";
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
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_join = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM JOIN=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { roomId } = args;
  const objectRoomId = new ObjectId(roomId);
  //Check arguments
  if (!token || !roomId) throw new Error("all arguments must be provided");
  if (!roomId.trim()) throw new Error("roomId must be provided");

  //Start transcation
  const session = client.startSession();

  try {
    //Verify token and get slug
    const newMemberSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      success: false,
      message: "",
      data: null,
    };
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the room collection')
        await session.abortTransaction();
        finalResult.message = `Cannot find a room with roomId=${roomId}`
        return
      }
      console.log('1 document was found in the room collection')
      //Check newMemberSlug exist
      const checkSlug: UserInMongo | null = await db
        .collection(collectionNames.users)
        .findOne({ slug: newMemberSlug }, { session });
      // console.log({ checkSlug });
      if (!checkSlug) {
        console.log(`0 document was found in the users collection`)
        await session.abortTransaction();
        finalResult.message = `${newMemberSlug} not exist in user database`;
        return;
      }
      console.log(`1 document was found in the users collection`)
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
        await session.abortTransaction();
        finalResult.message = `${newMemberSlug} has been blocked`;
        return;
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
        await session.abortTransaction();
        finalResult.message = `${newMemberSlug} already a member`;
        return;
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
        success: true,
        message: `join room success!`,
        data: dataResult,
      };
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    session.endSession();
    return finalResult;
  } catch (e) {
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected Error: ${e}`,
      data: null,
    };
  }
};
export { chat_room_join };
