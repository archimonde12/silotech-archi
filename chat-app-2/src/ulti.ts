import { genSaltSync, hash, hashSync, compareSync } from "bcrypt"
import md5 from "md5"
import { ClientSession, ObjectID } from "mongodb"
import { secretCombinePairKey } from "./config"
import { collectionNames, db } from "./mongo"

export const createInboxRoomKey = async (slug1: string, slug2: string) => {
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

export const checkRoomIdInMongoInMutation = async (objectRoomId: ObjectID, session: ClientSession) => {
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

export const testBcrypt = () => {
    console.log("Test bcrypt")
    const saltRounds = 10;
    const myPlaintextPassword = 's0/\/\P4$$w0rD';
    const someOtherPlaintextPassword = 'not_bacon';
    const salt = genSaltSync(saltRounds);
    console.log({salt})
    const hash = hashSync(myPlaintextPassword, salt);
    console.log({hash})
    console.log({resultTrue:compareSync(myPlaintextPassword, hash)})
    console.log({resultFalse:compareSync(someOtherPlaintextPassword, hash)})
}