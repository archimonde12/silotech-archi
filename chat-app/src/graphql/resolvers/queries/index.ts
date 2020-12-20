import { chatRooms } from "../../../fakeData/chatroom";
import { message } from "../../../fakeData/message";
import { Users } from "../../../fakeData/user";

const Query = {
  chat_app_show_all_user: () => Users,
  chat_app_show_all_chatroom: () => chatRooms.data,
  chat_app_get_all_message: (_, { chatRoomId }) =>
    message.data.filter((value) => (value.chatRoomId = chatRoomId)),
};

export { Query };
