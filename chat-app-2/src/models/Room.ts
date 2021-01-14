import { IndexSpecification, ObjectID } from "mongodb";
import { Message } from "./Message";
import { User } from "./User";

const RoomTypes = {
    inbox: 'inbox',
    public: 'public',
    global: 'global'
}

type RoomType="public"|"global"

type Room = {
    title: string
    createdBy: User
    type: RoomType
    createdAt: Date
    updatedAt: Date
    totalMembers: number
    lastMess: Message|null
}

type InboxRoom = {
    _id: string
    pair: User[]
    type: 'inbox'
    createdAt: Date
    updatedAt: Date
    lastMess: Message | null
}

type NewsRoomInMongo = {
    _id: string
    type:'news'
    updatedAt:Date
    lastMess:Message|null
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

type GlobalRoomInMongo={
    _id:string
    totalMembers:number
    type:RoomType
    updatedAt:Date
    lastMess: Message|null
}

const RoomIndexes: IndexSpecification[] = [
    { key: { _id:1, createdAt: 1 },unique:true},
]

export {
    Room,
    NewsRoomInMongo,
    RoomInMongo,
    GlobalRoomInMongo,
    RoomIndexes,
    RoomTypes,
    InboxRoom
}

