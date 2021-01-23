import { chat_room_create } from "./chat_room_create";
import { chat_room_delete } from "./chat_room_delete";
import { chat_room_join } from "./chat_room_join";
import { chat_room_leave } from "./chat_room_leave";
import { chat_room_add } from "./chat_room_add";
import { chat_room_remove } from "./chat_room_remove";
import { chat_room_block } from "./chat_room_block";
import { chat_message_send } from "./chat_message_send";
import { chat_message_delete } from "./chat_message_delete";
import { chat_room_set_role } from "./chat_room_set_role";
import { chat_room_remove_block } from "./chat_room_remove_block";
import { chat_friend_accept_request } from "./chat_friend_accept_request";
import { chat_friend_block } from "./chat_friend_block";
import { chat_friend_reject_request } from "./chat_friend_reject_request";
import { chat_friend_send_request } from "./chat_friend_send_request";
import { chat_friend_block_remove } from "./chat_friend_block_remove";
import {chat_system_publish_news} from "./chat_system_publish_news"

const Mutation = {
  //room
  chat_room_create,
  chat_room_delete,
  chat_room_join,
  chat_room_leave,
  chat_room_add,
  chat_room_remove,
  chat_room_block,
  chat_room_remove_block,
  chat_room_set_role,
  //message
  chat_message_send,
  chat_message_delete,
  //friend
  chat_friend_send_request,
  chat_friend_accept_request,
  chat_friend_reject_request,
  chat_friend_block,
  chat_friend_block_remove,
  //System
  chat_system_publish_news,
};
export { Mutation };
