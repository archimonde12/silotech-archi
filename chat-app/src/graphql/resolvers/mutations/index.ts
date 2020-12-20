import { chatRooms } from "../../../fakeData/chatroom";
import { message } from "../../../fakeData/message";
import { pubsub } from "../subscriptions";
const Mutation = {
  //public room
  chat_app_public_room_create_room: (parent, args, context, info) => {
    const { slug, title, member } = args;
    return chatRooms.addRoom(slug);
  },
  chat_app_public_room_delete_room: () => {},
  chat_app_public_room_join_room: () => {},
  chat_app_public_room_add_member: () => {},
  chat_app_public_room_remove_member: () => {},
  chat_app_public_room_block_member: () => {},
  //private room
  chat_app_private_room_create: (parent, args, context, info) => {},
  //send message
  chat_app_send_message: (parent, args, context, info) => {
    const { chatRoomId, slug, content, tag } = args;
    let newMessage = message.addMessage(chatRoomId, content, slug);
    pubsub.publish("test", { chat_app_listen_chat_room: newMessage });
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
