import { IndexSpecification, ObjectID } from "mongodb";

type Friend = {
    slug1: string
    slug2: string
    lastRequestSentAt: Date|null
    beFriendAt:Date|null
    isFriend: boolean
    isBlock: boolean
    _friendRequestFrom: String|null
    _blockRequest: String|null
}

type FriendInMongo = {
    slug1: string
    slug2: string
    lastRequestSentAt: Date|null
    beFriendAt:Date|null
    isFriend: boolean
    isBlock: boolean
    _friendRequestFrom: String|null
    _blockRequest: String|null
}

const FriendIndexes: IndexSpecification[] = [
    { key: { slug1: 1, slug2: 1 }, unique: true },
]

export {
    Friend,
    FriendInMongo,
    FriendIndexes
}