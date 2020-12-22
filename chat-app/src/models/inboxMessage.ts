import { IndexSpecification, ObjectID } from "mongodb";

type InboxMessage = {
    _id?: ObjectID
    inboxRoomId: ObjectID
    content: string
    createBy: string
    createdAt: Date
}
const InboxMessageIndexes: IndexSpecification[] = [
    { key: { inboxRoomId: 1,createAt:1 } },
]

export {
    InboxMessage,
    InboxMessageIndexes
}