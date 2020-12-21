import { IndexSpecification, ObjectID } from "mongodb";

type ChatRoom = {
    _id?: ObjectID
    title: string
    createBy: ObjectID
    block: [ObjectID]
    createdAt: Date
    updateAt:Date
    type:String
}
const ChatRoomIndexes: IndexSpecification[] = [
    { key: { title: 1, createBy: 1,updateAt:1} },
]

export {
    ChatRoom,
    ChatRoomIndexes
}