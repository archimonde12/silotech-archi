import { Friend } from "../../../models/Friend";
import { collectionNames, db, client } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const friend_block = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======FRIEND BLOCK REQUEST=====");
    //Get arguments
    console.log({ args });
    const { token, senderSlug } = args;
    //Check arguments
    if (!senderSlug.trim() || !token.trim()) throw new Error("all arguments must be provided")
   //Verify token and get slug
   let reciverSlug = await getSlugByToken(token)
    //Start transaction
    const session = client.startSession()
    session.startTransaction()
    try {
        //Check friend relationship exist and request has been sent
        const checkFriendQuery = {
            slug1: senderSlug > reciverSlug ? senderSlug : reciverSlug,
            slug2: senderSlug <= reciverSlug ? senderSlug : reciverSlug
        }
        const checkFriend = await db.collection(collectionNames.friends).findOne(checkFriendQuery, { session })
        console.log({ checkFriend })
        //checkFriend exist?
        if (!checkFriend) {
            //create new friend document
            const now = new Date()
            const newFriendDocument: Friend = {
                slug1: senderSlug > reciverSlug ? senderSlug : reciverSlug,
                slug2: senderSlug <= reciverSlug ? senderSlug : reciverSlug,
                lastRequestSentAt: null,
                beFriendAt: null,
                isFriend: false,
                isBlock: true,
                _friendRequestFrom: null,
                _blockRequest: [reciverSlug]
            }
            console.log({ newFriendDocument })
            const { insertedId } = await db.collection(collectionNames.friends).insertOne(newFriendDocument, { session })
            if (!insertedId) {
                await session.abortTransaction();
                session.endSession();
                throw new Error("Insert new friend relationship failed!")
            }
            return {
                success: true,
                message: `${reciverSlug} blocked ${senderSlug}!`,
                data: null
            }
        }
        //update friend documents
        if (checkFriend._blockRequest.includes(reciverSlug)) {
            await session.abortTransaction();
            session.endSession();
            throw new Error(`${reciverSlug} already blocked ${senderSlug}`)
        }
        const updateDoc = { $set: { _friendRequestFrom: null, isBlock: true }, $push: { _blockRequest: reciverSlug } }
        const { modifiedCount } = await db.collection(collectionNames.friends).updateOne(checkFriendQuery, updateDoc, { session })
        if (modifiedCount !== 1) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("update block request fail!")
        }
        await session.commitTransaction()
        await session.endSession()
        return {
            success: true,
            message: `${reciverSlug} blocked ${senderSlug}!`,
            data: null
        }
    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction();
            session.endSession();
        }
        throw e;
    }
}
export { friend_block }