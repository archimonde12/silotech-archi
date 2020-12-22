import { chatRooms } from "../../../fakeData/chatroom";
import { message } from "../../../fakeData/message";
import { pubsub } from "../subscriptions";
import { chat_app_public_room_create } from "./chat_app_public_room_create";
import { chat_app_public_room_delete } from "./chat_app_public_room_delete";
import { chat_app_public_room_join } from "./chat_app_public_room_join";
import { chat_app_public_room_leave } from "./chat_app_public_room_leave";
import {chat_app_inbox_get_room} from "./chat_app_inbox_get_room"
import {chat_app_public_room_add_member} from "./chat_app_public_room_add_member"
import {chat_app_public_room_remove_member} from "./chat_app_public_room_remove_member"
import {chat_app_send_message} from "./chat_app_send_message"
import {chat_app_send_inbox_message} from "./chat_app_send_inbox_message"

const Mutation = {
  //public room
  chat_app_public_room_create,
  chat_app_public_room_delete,
  chat_app_public_room_join,
  chat_app_public_room_leave,
  chat_app_public_room_add_member,
  chat_app_public_room_remove_member,
  chat_app_public_room_block_member: () => {},
  //private room
  chat_app_inbox_get_room,
  //send message
  chat_app_send_message,
  chat_app_send_inbox_message,
  // friend request
  chat_app_friend_request_send: () => {},
  chat_app_friend_request_accept: () => {},
  chat_app_friend_request_reject_one_time: () => {},
  chat_app_friend_request_reject_life_time: () => {},
};
export { Mutation };
