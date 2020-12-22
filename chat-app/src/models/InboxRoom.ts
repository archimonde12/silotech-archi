import { IndexSpecification, ObjectID } from "mongodb";

type InboxRoom = {
    _id?: ObjectID
    pairName: string
    members: [String]
    createdAt: Date
    updateAt: Date
}
const InboxRoomIndexes: IndexSpecification[] = [
    { key: { title: 1, updateAt: 1 } },
]

export {
    InboxRoom,
    InboxRoomIndexes
}