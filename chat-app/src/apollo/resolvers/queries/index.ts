import { chatRooms } from "../../../fakeData/chatroom";
import { message } from "../../../fakeData/message";
import { Users } from "../../../fakeData/user";
import { chat_app_show_chatroom_details } from "./chat_app_show_chatroom_details"
import {chat_app_get_all_message} from "./chat_app_get_all_message"

const Query = {
  chat_app_show_all_user: () => Users,
  chat_app_show_all_chatroom: () => chatRooms.data,
  chat_app_get_all_message,
  chat_app_show_chatroom_details
};

export { Query };
