import { client, collectionNames, db } from "../../../mongo";
import { Users } from "../../../fakeData/user";
import { ObjectId } from "mongodb";

const chat_app_public_room_quit = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  try {
    console.log({ args });
    const { slug, chatRoomId } = args;
    const objectChatRoomId = new ObjectId(chatRoomId);

    const foundChatRoom = await db
      .collection(collectionNames.chatRooms)
      .findOne({ _id: objectChatRoomId });
    console.log({ foundChatRoom });

    const foundUser = await db
      .collection(collectionNames.users)
      .findOne({ slug });
    console.log({ foundUser });

    const { chatRooms } = foundUser;
    console.log(chatRooms);

    if (foundChatRoom && foundUser) {
      const IndexOfRoomInUserData = chatRooms.findIndex(
        (value: ObjectId) =>
          value.toHexString() === objectChatRoomId.toHexString()
      );
      console.log({ IndexOfRoomInUserData });

      if (IndexOfRoomInUserData > -1) {
        await db
          .collection(collectionNames.users)
          .updateOne({ slug }, { $pull: { chatRooms: objectChatRoomId } });
        foundUser.chatRooms.splice(IndexOfRoomInUserData, 1);
        console.log("Quit success");
        return foundUser;
      }

      console.log("User not in the room");
      return null;
    }

    console.log("Room chat or user not exist");
    return null;
  } catch (e) {
    throw e;
  }
};

export { chat_app_public_room_quit };
