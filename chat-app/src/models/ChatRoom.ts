import { IndexSpecification, ObjectID } from "mongodb";

type ChatRoom = {
    title: string
    createdBy: string
    totalMembers:number
    blockMembers: [string]
    createdAt: Date
    updateAt:Date
}

type ChatRoomInMongoDB = {
    _id: ObjectID
    title: string
    createdBy: string
    totalMembers:number
    blockMembers: [string]
    createdAt: Date
    updateAt:Date
}

const ChatRoomIndexes: IndexSpecification[] = [
    { key: { title: 1, createBy: 1,updateAt:1} },
]

export {
    ChatRoom,
    ChatRoomIndexes
}