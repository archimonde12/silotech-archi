import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { ResultMessage } from "../../../models/ResultMessage";
import {
  client,
  collectionNames,
  db,
  transactionOptions,
} from "../../../mongo";
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";

const chat_room_delete = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======ROOM DELETE=====");
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
    const createrSlug = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      success: false,
      message: "",
      data: null,
    };
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData = await checkRoomIdInMongoInMutation(
        objectRoomId,
        session
      );
      //Check room type
      if (RoomData.type === `global` && createrSlug !== ADMIN_KEY) {
        await session.abortTransaction();
        finalResult.message = "wrong admin key!";
        return;
      }
      //Check master
      if (createrSlug !== RoomData.createdBy.slug) {
        await session.abortTransaction();
        finalResult.message = `${createrSlug} is not a master of this room`;
        return;
      }
      //Delete the room
      await db
        .collection(collectionNames.rooms)
        .deleteOne({ _id: objectRoomId }, { session });
      //Remove and user
      await db
        .collection(collectionNames.members)
        .deleteMany({ roomId: objectRoomId }, { session });
      //Delete all message
      await db
        .collection(collectionNames.messages)
        .deleteMany({ roomId: objectRoomId }, { session });
      finalResult.success = true;
      finalResult.message = `delete this room success!`;
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The reservation was successfully created.");
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
export { chat_room_delete };
