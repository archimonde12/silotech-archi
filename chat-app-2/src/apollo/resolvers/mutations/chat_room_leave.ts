import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
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
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_leave = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  //Start transcation
  const session = client.startSession();
  try {
    console.log("======ROOM LEAVE=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { roomId } = args;
    const objectRoomId = new ObjectId(roomId);
    //Check arguments
    if (!token || !roomId) throw new Error("all arguments must be provided");
    if (!roomId.trim()) throw new Error("roomId must be provided");
    //Verify token and get slug
    const memberSlug = await getSlugByToken(token);
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
      //Check member
      const memberData = await db
        .collection(collectionNames.members)
        .findOne(
          { $and: [{ roomId: objectRoomId }, { slug: memberSlug }] },
          { session }
        );
      // console.log({ memberData });
      if (!memberData) {
        console.log(`1 document was found in the members collection`)
        throw new Error("CA:026")
      }
      console.log(`0 document was found in the members collection`)
      //Check master
      if (memberData.role === MemberRole.master.name) throw new Error("CA:046")
      //Delete member document
      const { deletedCount } = await db
        .collection(collectionNames.members)
        .deleteOne({ _id: memberData._id }, { session });
      console.log(`${deletedCount} document was deleted in the members collection`)
      //Update room document
      const { modifiedCount } = await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: -1 } },
          { session }
        );
      console.log(`${modifiedCount} document was updated in the room collection. Field change = totalMembers`)
      const listenData = {
        roomId: roomId.toString(),
        content: `${memberSlug} leave this room`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        message: `leave new room success!`,
        data: memberData,
      };
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    return finalResult
  } catch (e) {
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
export { chat_room_leave };
