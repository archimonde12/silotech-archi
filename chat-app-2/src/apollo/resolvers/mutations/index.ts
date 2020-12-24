import { room_create } from "./room_create"
import { room_delete } from "./room_delete"
import { room_join } from "./room_join"
import { room_leave } from "./room_leave"
import { room_add } from "./room_add"
import { room_remove } from "./room_remove"
import { message_send } from "./message_send"
import {inbox_create} from "./inbox_create"

const Mutation = {
    //room
    room_create,
    room_delete,
    room_join,
    room_leave,
    room_add,
    room_remove,
    inbox_create,
    //message
    message_send
};
export { Mutation };
