import { IndexSpecification, ObjectID } from "mongodb"

type TelegramUserData = {
    auth_date: number
    first_name: string
    hash?: string
    id: number
    last_name: string
    username: string
}

type TelegramUserDataInMongo = {
    _id: ObjectID
    auth_date: number
    first_name: string
    hash: string
    id: number
    last_name: string
    username: string
}

const TelegramUserIndexes: IndexSpecification[] = [
    { key: { id: 1, username: 1 }, unique: true },
]

export { TelegramUserData, TelegramUserDataInMongo, TelegramUserIndexes }