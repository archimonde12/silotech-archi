import { IndexSpecification, ObjectID } from "mongodb";

type FriendRequest = {
    _id?: ObjectID
    sender: ObjectID
    reciver: ObjectID
    createdAt: Date
    status: string
    email?: string
}
const FriendRequestIndexes: IndexSpecification[] = [
    { key: { reciver: 1, sender: 1,status:1 } },
    {key: {email: 1}, unique: true, partialFilterExpression: {email: {$exists: true}}}
]

export {
    FriendRequest,
    FriendRequestIndexes
}