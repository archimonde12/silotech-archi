import { client, collectionNames, db } from "../../../mongo";
import { Users } from "../../../fakeData/user";
import { ObjectId } from "mongodb";

const chat_app_public_room_delete = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  try {
    console.log({ args });
    const { slug, chatRoomId } = args;
    const foundChatRoom = await db
      .collection(collectionNames.chatRooms)
      .findOne({ _id: new ObjectId(chatRoomId) });
    if (foundChatRoom) {
      if (foundChatRoom.createBy.slug === slug) {
        await db
          .collection(collectionNames.users)
          .updateOne({ slug }, { $pull: { chatRooms: foundChatRoom._id } });
        await db
          .collection(collectionNames.chatRooms)
          .deleteOne({ _id: new ObjectId(chatRoomId) });
        return foundChatRoom;
      }
      return null;
    }
    return null;
  } catch (e) {
    throw e;
  }
};

export { chat_app_public_room_delete };
