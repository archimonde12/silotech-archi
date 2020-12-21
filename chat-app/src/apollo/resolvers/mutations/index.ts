import { chatRooms } from "../../../fakeData/chatroom";
import { message } from "../../../fakeData/message";
import { pubsub } from "../subscriptions";
import { chat_app_public_room_create } from "./chat_app_public_room_create";
import { chat_app_public_room_delete } from "./chat_app_public_room_delete";
import { chat_app_public_room_join } from "./chat_app_public_room_join";
import { chat_app_public_room_quit } from "./chat_app_public_room_quit";
const Mutation = {
  //public room
  chat_app_public_room_create,
  chat_app_public_room_delete,
  chat_app_public_room_join,
  chat_app_public_room_quit,
  chat_app_public_room_add_member: () => {},
  chat_app_public_room_remove_member: () => {},
  chat_app_public_room_block_member: () => {},
  //private room
  chat_app_private_room_create: (parent, args, context, info) => {},
  //send message
  chat_app_send_message: (parent, args, context, info) => {
    const { chatRoomId, slug, content, tag } = args;
    let newMessage = message.addMessage(chatRoomId, content, slug);
    pubsub.publish("COMMENT_ADDED", { chat_app_listen_chat_room: newMessage });
    console.log(newMessage);
    return newMessage;
  },
  // friend request
  chat_app_friend_request_send: () => {},
  chat_app_friend_request_accept: () => {},
  chat_app_friend_request_reject_one_time: () => {},
  chat_app_friend_request_reject_life_time: () => {},
};
export { Mutation };
