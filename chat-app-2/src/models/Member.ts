import { IndexSpecification, ObjectID } from "mongodb";

const MemberRole = {
    admin: {
        id: '0',
        name: 'admin'
    },
    master: {
        id: '1',
        name: 'master'
    },
    member: {
        id: '2',
        name: 'member'
    },
}

type Member = {
    slug: string
    roomId: ObjectID
    joinedAt: Date
    role: string
}

type MemberGlobal = {
    slug: string
    roomId: string
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

type MemberGlobalInMongo = {
    _id: ObjectID
    slug: string
    roomId: string
    joinedAt: Date
    role: string
}

const MemberIndexes: IndexSpecification[] = [
    { key: { roomId: 1, slug: 1 }, unique: true },
]

export {
    Member,
    MemberInMongo,
    MemberGlobal,
    MemberIndexes,
    MemberRole
}