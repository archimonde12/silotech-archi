import { IndexSpecification, ObjectID } from "mongodb";

type User = {
    slug: string
    createdAt: Date
}

type UserInMongo = {
    _id: ObjectID
    slug: string
    createdAt: Date
}

const UserIndexes: IndexSpecification[] = [
    { key: { slug: 1 } },
]

export {
    User,
    UserInMongo,
    UserIndexes
}