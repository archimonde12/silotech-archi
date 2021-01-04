import { genSaltSync, hash, hashSync, compareSync } from "bcrypt"
import { Client } from "grpc"
import md5 from "md5"
import { ClientSession, ObjectID } from "mongodb"
import { secretCombinePairKey } from "./config"
import { VerifyToken } from "./grpc/account-service-client"
import { User } from "./models/User"
import { collectionNames, db } from "./mongo"

export const createInboxRoomKey = (slug1: string, slug2: string):string => {
    if (slug1 > slug2) {
        let combine = [slug1, secretCombinePairKey, slug2]
        let combineString = JSON.stringify(combine)
        let combineEncoded = md5(combineString)
        console.log({ combineEncoded })
        return combineEncoded
    }
    let combine = [slug2, secretCombinePairKey, slug1]
    let combineString = JSON.stringify(combine)
    let combineEncoded = md5(combineString)
    console.log({ combineEncoded })
    return combineEncoded
}

export const checkRoomIdInMongoInMutation = async (objectRoomId: ObjectID, session?: ClientSession) => {
    try {
        if (session) {
            let RoomData = await db
                .collection(collectionNames.rooms)
                .findOne({ _id: objectRoomId }, { session });
            console.log({ RoomData });
            if (!RoomData) {
                await session.abortTransaction();
                session.endSession();
                throw new Error("RoomId not exist");
            }
            return RoomData
        }
        let RoomData = await db
            .collection(collectionNames.rooms)
            .findOne({ _id: objectRoomId });
        console.log({ RoomData });
        return RoomData
    }
    catch (e) {
        throw e
    }
}

export const checkUsersInDatabase = async (slugs: string[], session?: ClientSession): Promise<string[]> => {
    try {
        if (slugs === []) return [];
        //Check slugs in mongo
        const usersInMongo: User[] = session
            ? await db.collection(collectionNames.users).find({ slug: { $in: slugs } }, { session }).toArray()
            : await db.collection(collectionNames.users).find({ slug: { $in: slugs } }).toArray()
        console.log(usersInMongo)
        const slugsInMongo = usersInMongo.map(user => user.slug)
        console.log({ slugsInMongo })
        return slugsInMongo
    } catch (e) {
        throw e
    }
}

export const getSlugByToken = async (token: String): Promise<string> => {
    if(!token||!token.trim()) throw new Error("token must be provided!")
    const tokenVerifyRes = await VerifyToken(token)
    if (!tokenVerifyRes) throw new Error("token invalid!")
    return tokenVerifyRes.result
}

