import { collectionNames, db, client } from "../../../mongo";

const friend_accept_request = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======FRIEND ACCEPT REQUEST=====");
    //Get arguments
    console.log({ args });
    const { reciverSlug, senderSlug } = args;
    //Check arguments
    if (!senderSlug.trim() || !reciverSlug.trim()) throw new Error("all arguments must be provided")
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
        //Check friendRelationship exist| isFriend | isBlock | friendRestFrom
        if (!checkFriend || checkFriend.isFriend || checkFriend.isBlock || checkFriend._friendRequestFrom !== senderSlug) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Accept fail!")
        }
        //Update friend docments
        const updateDoc = { $set: { _friendRequestFrom: null, isFriend: true } }
        const { modifiedCount } = await db.collection(collectionNames.friends).updateOne(checkFriendQuery, updateDoc, { session })
        if (modifiedCount !== 1) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("update accept request fail!")
        }
        await session.commitTransaction()
        await session.endSession()
        return{
            success: true,
            message: `${reciverSlug} and ${senderSlug} become friends`,
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
export { friend_accept_request }