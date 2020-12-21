import { IndexSpecification, ObjectID } from "mongodb";

type User = {
    userName: string
    friend: [ObjectID]
    block: [ObjectID]
    chatRooms:[ObjectID]
    createdAt: Date
}

type UserInMongo={
    _id: ObjectID
    userName: string
    friend: [ObjectID]
    block: [ObjectID]
    createdAt: Date
    chatRooms:[ObjectID]
}

export {
    User,
    UserInMongo
}