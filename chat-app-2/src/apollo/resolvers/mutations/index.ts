import { chat_api_user_room_create } from "./chat_api_user_room_create";
import { chat_api_user_room_delete } from "./chat_api_user_room_delete";
import { chat_api_user_room_join } from "./chat_api_user_room_join";
import { chat_api_user_room_leave } from "./chat_api_user_room_leave";
import { chat_api_user_room_add } from "./chat_api_user_room_add";
import { chat_api_user_room_remove } from "./chat_api_user_room_remove";
import { chat_api_user_room_block } from "./chat_api_user_room_block";
import { chat_api_user_room_unblock } from "./chat_api_user_room_unblock";
import { chat_api_user_room_role_set } from "./chat_api_user_room_role_set";
import { chat_api_user_message_send } from "./chat_api_user_message_send";
import { chat_api_user_message_delete } from "./chat_api_user_message_delete";
import { chat_api_user_friend_request_send } from "./chat_api_user_friend_request_send";
import { chat_api_user_friend_request_accept } from "./chat_api_user_friend_request_accept";
import { chat_api_user_friend_request_reject } from "./chat_api_user_friend_request_reject";
import { chat_api_user_friend_block } from "./chat_api_user_friend_block";
import { chat_api_user_friend_unblock } from "./chat_api_user_friend_unblock";
import {chat_api_system_publish_news} from "./chat_api_system_publish_news"

const Mutation = {
  //room
  
  chat_api_user_room_create,
  chat_api_user_room_delete,
  chat_api_user_room_join,
  chat_api_user_room_leave,
  chat_api_user_room_add,
  chat_api_user_room_remove,
  chat_api_user_room_block,
  chat_api_user_room_unblock,
  chat_api_user_room_role_set,
  //message
  chat_api_user_message_send,
  chat_api_user_message_delete,
  //friend
  chat_api_user_friend_request_send,
  chat_api_user_friend_request_accept,
  chat_api_user_friend_request_reject,
  chat_api_user_friend_block,
  chat_api_user_friend_unblock,
  //System
  chat_api_system_publish_news,
};
export { Mutation };
