import { get_all_members } from "./get_all_members"
import { get_all_rooms } from "./get_all_rooms"
import { get_messages } from "./get_messages"
import { get_room_details } from "./get_room_details"

const Query = {
    //Room
    get_all_rooms,
    get_room_details,
    //Message
    get_messages,
    //Member
    get_all_members,
};

export { Query };
