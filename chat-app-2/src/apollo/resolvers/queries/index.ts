import { chat_get_all_members } from "./chat_get_all_members"
import { chat_get_all_rooms } from "./chat_get_all_rooms"
import { chat_get_messages_in_room } from "./chat_get_messages_in_room"
import { chat_get_room_details } from "./chat_get_room_details"
import {chat_get_inbox_rooms} from "./chat_get_inbox_rooms"
import {chat_get_all_friends} from "./chat_get_all_friends"
import {chat_get_all_friend_requests} from "./chat_get_all_friend_requests"
import {chat_search_users} from "./chat_search_users"
import {chat_get_mix_rooms} from "./chat_get_mix_rooms"
const Query = {
    //Search users
    chat_search_users,
    //Room
    chat_get_all_rooms,
    chat_get_room_details,
    chat_get_inbox_rooms,
    chat_get_mix_rooms,
    //Message
    chat_get_messages_in_room,
    //Member
    chat_get_all_members,
    //Friend
    chat_get_all_friends,
    chat_get_all_friend_requests
};

export { Query };
