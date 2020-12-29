import { IndexSpecification, ObjectID } from "mongodb";
import { Message } from "./Message";
import { User } from "./User";

const RoomTypes = {
    inbox: 'inbox',
    public: 'public',
    global: 'global'
}

type Room = {
    title: string
    createdBy: User
    type: string
    createdAt: Date
    updatedAt: Date
    totalMembers: number
    lastMess: Message|null
}

type RoomInMongo = {
    _id: ObjectID
    title: string
    createdBy: User
    type: string
    createdAt: Date
    updatedAt: Date
    totalMembers: number
    lastMess: Message|null
}

const RoomIndexes: IndexSpecification[] = [
    { key: { title: 1, createdBy: 1, createdAt: 1 } },
]

export {
    Room,
    RoomInMongo,
    RoomIndexes,
    RoomTypes

}

