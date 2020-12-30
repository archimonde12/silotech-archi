import { room_create } from "./room_create";
import { room_delete } from "./room_delete";
import { room_join } from "./room_join";
import { room_leave } from "./room_leave";
import { room_add } from "./room_add";
import { room_remove } from "./room_remove";
import { room_block } from "./room_block";
import { message_send } from "./message_send";
import { message_delete } from "./message_delete";
import {room_set_role} from "./room_set_role"
import {room_remove_block} from "./room_remove_block"
import {friend_accept_request} from "./friend_accept_request"
import {friend_block} from "./friend_block"
import {friend_reject_request} from "./friend_reject_request"
import {friend_send_request} from "./friend_send_request"
import {friend_block_remove} from "./friend_block_remove"

const Mutation = {
  //room
  room_create,
  room_delete,
  room_join,
  room_leave,
  room_add,
  room_remove,
  room_block,
  room_remove_block,
  room_set_role,
  //message
  message_send,
  message_delete,
  //friend
  friend_send_request,
  friend_accept_request,
  friend_reject_request,
  friend_block,
  friend_block_remove,
};
export { Mutation };
