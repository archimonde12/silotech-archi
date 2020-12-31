import { get_all_members } from "./get_all_members"
import { get_all_rooms } from "./get_all_rooms"
import { get_messages_in_room } from "./get_messages_in_room"
import { get_room_details } from "./get_room_details"
import {get_other_public_rooms} from "./get_other_public_rooms"
import {get_inbox_rooms} from "./get_inbox_rooms"
import {get_all_friends} from "./get_all_friends"
import {get_all_friend_requests} from "./get_all_friend_requests"
const Query = {
    //Room
    get_all_rooms,
    get_room_details,
    get_inbox_rooms,
    //Message
    get_messages_in_room,
    //Member
    get_all_members,
    //Friend
    get_all_friends,
    get_all_friend_requests
};

export { Query };
