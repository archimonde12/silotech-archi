import { IndexSpecification, ObjectID } from "mongodb";

type User = {
    slug: string
    friend: [string]
    block: [string]
    chatRooms:[ObjectID]
    inboxRooms:[ObjectID]
    createdAt: Date
}

type UserInMongo={
    _id: ObjectID
    slug: string
    friend: [ObjectID]
    block: [ObjectID]
    createdAt: Date
    chatRooms:[ObjectID]
    inboxRooms:[ObjectID]
}

export {
    User,
    UserInMongo
}