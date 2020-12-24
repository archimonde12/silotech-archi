import { ObjectId } from "mongodb";
import { RoomTypes } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";

const get_messages = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======GET MESSAGES=====");
  //Get arguments
  console.log({ args });
  const { slug, roomId, limit } = args;
  const objectRoomId = new ObjectId(roomId);
  try {
    //Check roomId exist
    const RoomData = await db
      .collection(collectionNames.rooms)
      .findOne({ _id: objectRoomId });
    console.log({ RoomData });
    if (!RoomData) {
      throw new Error("RoomId not exist");
    }
    //Check member
    const memberData = await db
      .collection(collectionNames.members)
      .findOne({ $and: [{ roomId: objectRoomId }, { slug }] });
    console.log({ memberData });
    if (!memberData && RoomData.type === RoomTypes.inbox) {
      throw new Error(`${slug} is not a member`);
    }
    //Query Message
    const allMessage = await db
      .collection(collectionNames.messages)
      .find({ roomId: objectRoomId })
      .limit(limit)
      .sort({ sentAt: -1 })
      .toArray();
    allMessage.sort((a, b) => a.sentAt - b.sentAt);
    return allMessage;
  } catch (e) {
    throw e;
  }
};
export { get_messages };
