import { client, collectionNames, db } from "../../../mongo";
import { Users } from "../../../fakeData/user";
import { ObjectId } from "mongodb";

const chat_app_public_room_delete = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("======PUBLIC ROOM DELETE=====")
  //Get arguments
  console.log({ args });
  const { slug, chatRoomId } = args;
  //Start transcation
  const session = client.startSession()
  session.startTransaction()
  try {
    //Check chatroom exist
    const foundChatRoom = await db
      .collection(collectionNames.chatRooms)
      .findOne({ _id: new ObjectId(chatRoomId) });
    console.log({ foundChatRoom })
    if (foundChatRoom) {
      //Check slug is creater of this room
      if (foundChatRoom.createdBy.slug === slug) {
        //Remove chatroomId in all member 
        let allMemberQuery = { chatRooms: { $elemMatch: { $eq: foundChatRoom._id } } }
        await db
          .collection(collectionNames.users)
          .updateMany(allMemberQuery, { $pull: { chatRooms: foundChatRoom._id } });
        //Remove chatroom document
        await db
          .collection(collectionNames.chatRooms)
          .deleteOne({ _id: new ObjectId(chatRoomId) });
        //End transcation
        await session.commitTransaction()
        session.endSession()
        return { success: true, message: `Delete room ${chatRoomId} success` };
      }
      await session.abortTransaction()
      session.endSession()
      return { success: false, message: `${slug} is not create this chatroom` };
    }
    await session.abortTransaction()
      session.endSession()
    return { success: false, message: `chatroomId not exist` };
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction()
      session.endSession()
    }
    throw e;
  }
};

export { chat_app_public_room_delete };
