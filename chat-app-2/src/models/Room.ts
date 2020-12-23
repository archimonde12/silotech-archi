import { IndexSpecification, ObjectID } from "mongodb";

const RoomTypes = {
    inbox: 'inbox',
    public: 'public',
    global: 'global'
}

type Room = {
    title: string
    createdBy: string
    type: string
    createdAt: Date
    updatedAt: Date
    totalMembers: number
    lastMess: string
}

type RoomInMongo = {
    _id: ObjectID
    title: string
    createdBy: string
    type: string
    createdAt: Date
    updatedAt: Date
    totalMembers: number
    lastMess: string
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