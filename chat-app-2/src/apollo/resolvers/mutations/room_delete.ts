import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation } from "../../../ulti";

const room_delete = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM DELETE=====");
  //Get arguments
  console.log({ args });
  const { createrSlug, roomId } = args;
  const objectRoomId = new ObjectId(roomId);
  //Check arguments
  if (!createrSlug.trim()) throw new Error("createrSlug must be provided")

  //Start transcation
  const session = client.startSession();
  session.startTransaction();
  try {
    //Check roomId exist
    let RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session)
    //Check room type
    if (RoomData.type === `inbox`) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Cannot delete! Because this room is inboxRoom ");
    }
    if (RoomData.type === `global` && createrSlug !== ADMIN_KEY) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("wrong admin key!");
    }

    //Check master
    if (createrSlug !== RoomData.createdBy.slug) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${createrSlug} is not a master of this room`);
    }
    //Delete the room
    await db.collection(collectionNames.rooms).deleteOne({ _id: objectRoomId }, { session });
    //Remove and user
    await db
      .collection(collectionNames.members)
      .deleteMany({ roomId: objectRoomId }, { session });
    //Delete all message
    await db.collection(collectionNames.messages).deleteMany({ roomId: objectRoomId }, { session })
    await session.commitTransaction();
    await session.endSession()
    return { success: true, message: `delete this room success!`, data: null };
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
};
export { room_delete };
