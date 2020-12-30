import { IndexSpecification, ObjectID } from "mongodb";
import { Message } from "./Message";
import { User } from "./User";

type InboxRoom = {
    roomKey: string
    pair: User[]
    lastMess: Message | null
}

type InboxRoomInMongo = {
    _id: ObjectID
    roomKey: string
    pair: User[]
    lastMess: Message | null
}

const InboxRoomIndexes: IndexSpecification[] = [
    { key: { roomKey: 1 },unique:true},
    { key: { "lastMess.sentAt": 1 } }
]

export {
    InboxRoom,
    InboxRoomInMongo,
    InboxRoomIndexes
}