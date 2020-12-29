import { ObjectId } from "mongodb";
import { RoomTypes } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";
import { createInboxRoomKey, testBcrypt } from "../../../ulti";

const get_messages_in_room = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======GET MESSAGES=====");
  //Get arguments
  console.log({ args });
  const { sender, reciver, limit, skip } = args;
  try {
    //reciver is a room
    if (ObjectId.isValid(reciver)) {
      const objectRoomId = new ObjectId(reciver);
      //Check roomId exist
      const RoomData = await db
        .collection(collectionNames.rooms)
        .findOne({ _id: objectRoomId });
      console.log({ RoomData });
      if (!RoomData) {
        throw new Error("RoomId not exist");
      }
      //Query Message
      const allMessage = await db
        .collection(collectionNames.messages)
        .find({ roomId: objectRoomId })
        .limit(limit)
        .skip(skip)
        .sort({ sentAt: -1 })
        .toArray();
      allMessage.sort((a, b) => a.sentAt - b.sentAt);
      return allMessage;
    }
    //reciver is a slug
    if (!sender.trim()) {
      throw new Error("sender must provide in this situation")
    }
    const roomKey =await createInboxRoomKey(sender, reciver)
    const checkSlugs = [sender, reciver]
    //Check sender and reciver exist in database
    const findUsersRes = await db
      .collection(collectionNames.users)
      .find({ slug: { $in: checkSlugs } })
      .toArray();
    console.log({findUsersRes})
    if (findUsersRes.length !== 2) {
      throw new Error("someone not exist in database!");
    }
    //Query Message
    const allMessage = await db
      .collection(collectionNames.messages)
      .find({ roomKey })
      .limit(limit)
      .skip(skip)
      .sort({ sentAt: -1 })
      .toArray();
    allMessage.sort((a, b) => a.sentAt - b.sentAt);
    return allMessage;
  } catch (e) {
    throw e;
  }
};
export { get_messages_in_room };