import { IndexSpecification, ObjectID } from "mongodb";
import { Message } from "./Message";
import { User } from "./User";

type InboxRoom = {
    roomKey: string
    pair: User[]
    lastMess: Message | null
    blockRequest: User[]
    friendContract: User[]
}

type InboxRoomInMongo = {
    _id: ObjectID
    roomKey: string
    pair: User[]
    lastMess: Message | null
    blockRequest: User[]
    friendContract: User[]
}

const InboxRoomIndexes: IndexSpecification[] = [
    { key: { roomKey: 1 } },
    { key: { "lastMess.sentAt": 1 } }
]

export {
    InboxRoom,
    InboxRoomInMongo,
    InboxRoomIndexes
}