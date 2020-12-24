import { get_all_members } from "./get_all_members"
import { get_all_rooms } from "./get_all_rooms"
import { get_messages } from "./get_messages"
import { get_room_details } from "./get_room_details"
import {get_other_public_rooms} from "./get_other_public_rooms"

const Query = {
    //Room
    get_all_rooms,
    get_room_details,
    get_other_public_rooms,
    //Message
    get_messages,
    //Member
    get_all_members,
};

export { Query };
