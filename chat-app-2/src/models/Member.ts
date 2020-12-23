import { IndexSpecification, ObjectID } from "mongodb";

const MemberRole = {
    member: 'member',
    master: 'master'
}

type Member = {
    slug: string
    roomId: ObjectID
    joinedAt: Date
    role: string
}

type MemberInMongo = {
    _id: ObjectID
    slug: string
    roomId: ObjectID
    joinedAt: Date
    role: string
}

const MemberIndexes: IndexSpecification[] = [
    { key: { roomId: 1, role: 1, joinedAt: 1, slug: 1 } },
]

export {
    Member,
    MemberInMongo,
    MemberIndexes,
    MemberRole
}