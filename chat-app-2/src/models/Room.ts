import { IndexSpecification, ObjectID } from "mongodb";
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
    lastMess: string|null
}

type RoomInMongo = {
    _id: ObjectID
    title: string
    createdBy: User
    type: string
    createdAt: Date
    updatedAt: Date
    totalMembers: number
    lastMess: string|null
}

const RoomIndexes: IndexSpecification[] = [
    { key: { title: 1, createdBy: 1, updateAt: 1 } },
]

export {
    Room,
    RoomInMongo,
    RoomIndexes,
    RoomTypes

}

