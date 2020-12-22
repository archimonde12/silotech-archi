import { client, collectionNames, db } from "../../../mongo";
import { checkSlugExistInDatabase, Users } from "../../../fakeData/user";
import { ObjectId } from "mongodb";
import { errorMessage } from "../../../config";

const chat_app_public_room_leave = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {

  console.log("======PUBLIC ROOM LEAVE=====")
  //Get arguments
  console.log({ args });
  const { slug, chatRoomId } = args;
  const objectChatRoomId = new ObjectId(chatRoomId);
  //Check user exist in database

  const isMemberExist = checkSlugExistInDatabase(slug)
  if (!isMemberExist) {
    throw new Error(errorMessage.userNotExistInDataBase(slug))
  }
  //Start transcation
  const session = client.startSession()
  session.startTransaction()
  try {
    const foundChatRoom = await db
      .collection(collectionNames.chatRooms)
      .findOne({ _id: objectChatRoomId });
    console.log({ foundChatRoom });
    if (foundChatRoom) {
      //check user is a member
      let checkIsOldMemberQuery = { slug, chatRooms: { $all: [foundChatRoom._id] } }
      let checkIsOldMemberRes = await db.collection(collectionNames.users).findOne(checkIsOldMemberQuery)
      if (checkIsOldMemberRes) {
        //Update mongo data
        await db.collection(collectionNames.users).updateOne({ slug }, { $pull: { chatRooms: objectChatRoomId } })
        await db.collection(collectionNames.chatRooms).updateOne({ _id: objectChatRoomId }, { $inc: { totalMembers: -1 } })
        await session.commitTransaction()
        session.endSession()
        return { success: true, message: `Leave room ${chatRoomId} success!` }
      }
      await session.abortTransaction()
      session.endSession()
      return { success: false, message: `${slug} is not a member in this room` }
    }
    await session.abortTransaction()
    session.endSession()
    throw new Error(`chatroomId not exist`)
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction()
      session.endSession()
    }
    throw e;
  }
};

export { chat_app_public_room_leave };
