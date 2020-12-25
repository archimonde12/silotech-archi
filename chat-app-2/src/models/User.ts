import { IndexSpecification, ObjectID } from "mongodb";

type User = {
    slug: string
}

type UserInMongo = {
    _id: ObjectID
    slug: string
}

const UserInMongoIndexes: IndexSpecification[] = [
    { key: { slug: 1 } },
]

export {
    User,
    UserInMongo,
    UserInMongoIndexes
}