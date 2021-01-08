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
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_leave = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======ROOM LEAVE=====");
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
    const memberSlug = await getSlugByToken(token);
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
        .findOne({ slug: memberSlug }, { session });
      // console.log({ checkSlug });
      if (!checkSlug) {
        console.log(`0 document was found in the users collection`)
        await session.abortTransaction();
        finalResult.message = `${memberSlug} not exist in user database`;
        return;
      }
      console.log(`1 document was found in the users collection`)
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
        await session.abortTransaction();
        finalResult.message = `${memberSlug} is not a member`;
        return;
      }
      console.log(`0 document was found in the members collection`)
      //Check master
      if (memberData.role === MemberRole.master.name) {
        await session.abortTransaction();
        finalResult.message = `${memberSlug} is master. Cannot leave`;
        return;
      }
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
        success: true,
        message: `leave new room success!`,
        data: memberData,
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
export { chat_room_leave };
