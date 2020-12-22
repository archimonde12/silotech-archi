import { client, collectionNames, db } from "../../../mongo";
import { checkSlugExistInDatabase, Users } from "../../../fakeData/user";
import { ObjectId } from "mongodb";
import { errorMessage } from "../../../config";

const chat_app_public_room_remove_member = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {

  console.log("======PUBLIC ROOM REMOVE MEMBER=====")
  //Get arguments
  console.log({ args });
  const { master, chatRoomId, member } = args;
  const objectChatRoomId = new ObjectId(chatRoomId);
  //Check user exist in database
  const memberAndOwner = [...member, master]
  const isEveryMemberExist = memberAndOwner.every(slug => checkSlugExistInDatabase(slug))
  if (!isEveryMemberExist) {
    throw new Error(errorMessage.someUserNotExistInDataBase)
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
      //Check slug is creater of this room
      if (foundChatRoom.createdBy.slug === master) {
        //Check add member is old member
        // let checkIsOldMemberQuery = { slug: { $in: member }, chatRooms: { $not: { $all: [foundChatRoom._id] } } }
        let checkIsOldMemberQuery = { slug: { $in: member }, chatRooms: { $all: [foundChatRoom._id] } }
        let checkIsOldMemberRes = await db.collection(collectionNames.users).find(checkIsOldMemberQuery).toArray()
        console.log({ checkIsOldMemberRes })
        if (checkIsOldMemberRes.length === member.length) {
          let allAddMemberQuery = { slug: { $in: member } }
          let updateAllAddMemberData = await db.collection(collectionNames.users).updateMany(allAddMemberQuery, { $pull: { chatRooms: objectChatRoomId } })
          console.log({ docModifiedCount: updateAllAddMemberData.modifiedCount })
          await db.collection(collectionNames.chatRooms).updateOne({ _id: objectChatRoomId }, { $inc: { totalMembers: -member.length } })
          foundChatRoom.totalMembers -= member.length
          //End transcation
          await session.commitTransaction()
          session.endSession()
          return foundChatRoom
        }
        await session.abortTransaction()
        session.endSession()
        throw new Error(`someone is not a member of this room`)
      }
      await session.abortTransaction()
      session.endSession()
      throw new Error(`${master} is not create this chatroom`)
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

export { chat_app_public_room_remove_member };
