import { chatRooms } from "../../../fakeData/chatroom";
import { message } from "../../../fakeData/message";
import { Users } from "../../../fakeData/user";
import { chat_app_show_chatroom_details } from "./chat_app_show_chatroom_details"
import { chat_app_get_all_message } from "./chat_app_get_all_message"
import { chat_app_get_all_inbox_message } from "./chat_app_get_all_inbox_message"
import { chat_app_show_all_public_chatrooms } from "./chat_app_show_all_public_chatrooms"
import { chat_app_show_all_my_chatrooms } from "./chat_app_show_all_my_chatrooms"
import { chat_app_show_all_inboxroom } from "./chat_app_show_all_inboxroom"


const Query = {
  //Query all chat room all inbox room 
  chat_app_show_all_user: () => Users,
  chat_app_show_all_public_chatrooms,
  chat_app_show_all_my_chatrooms,
  chat_app_show_all_inboxroom,
  //Query room details
  chat_app_show_chatroom_details,
  //Query all message in room
  chat_app_get_all_inbox_message,
  chat_app_get_all_message,
};

export { Query };
