const Mutation = {
  //public room
  chat_app_public_room_create_room: () => {},
  chat_app_public_room_delete_room: () => {},
  chat_app_public_room_join_room: () => {},
  chat_app_public_room_add_member: () => {},
  chat_app_public_room_remove_member: () => {},
  chat_app_public_room_block_member: () => {},
  //private room
  chat_app_private_room_create: () => {},
  //send message
  chat_app_send_message: () => {},
  // friend request
  chat_app_friend_request_send: () => {},
  chat_app_friend_request_accept: () => {},
  chat_app_friend_request_reject_one_time: () => {},
  chat_app_friend_request_reject_life_time: () => {},
};
export { Mutation };
