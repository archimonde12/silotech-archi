import { IndexSpecification, ObjectID } from "mongodb";

type Message = {
    _id?: ObjectID
    chatRoomId: ObjectID
    content: string
    createBy: string
    createdAt: Date
}
const MessageIndexes: IndexSpecification[] = [
    { key: { chatRoomId: 1,createAt:1 } },
]

export {
    Message,
    MessageIndexes
}