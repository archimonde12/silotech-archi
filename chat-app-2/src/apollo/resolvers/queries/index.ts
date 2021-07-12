import {chat_api_usernames_search} from "./chat_api_usernames_search"
import { chat_api_room_details_get } from "./chat_api_room_details_get"
import { chat_api_all_rooms_get } from "./chat_api_all_rooms_get"
import {chat_api_inbox_rooms_get} from "./chat_api_inbox_rooms_get"
import {chat_api_mix_rooms_get} from "./chat_api_mix_rooms_get"
import { chat_api_messages_in_room_get } from "./chat_api_messages_in_room_get"
import { chat_api_all_members_get } from "./chat_api_all_members_get"
import {chat_api_all_friends_get} from "./chat_api_all_friends_get"
import {chat_api_all_friend_request_get} from "./chat_api_all_friend_request_get"

const Query = {
    //Search users
    chat_api_usernames_search,
    //Room
    chat_api_room_details_get,
    chat_api_all_rooms_get,
    chat_api_inbox_rooms_get,
    chat_api_mix_rooms_get,
    //Message
    chat_api_messages_in_room_get,
    //Member
    chat_api_all_members_get,
    //Friend
    chat_api_all_friends_get,
    chat_api_all_friend_request_get
};

export { Query };
