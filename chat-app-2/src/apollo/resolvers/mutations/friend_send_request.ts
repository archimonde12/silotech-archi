import { Friend } from "../../../models/Friend";
import { client, collectionNames, db } from "../../../mongo";

const friend_send_request = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======FRIEND REQUEST SEND=====");
    //Get arguments
    console.log({ args });
    const { senderSlug, reciverSlug } = args;
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
        console.log({checkFriend})
        if (checkFriend) {
            //Check is Friend
            if (checkFriend.isFriend) {
                await session.abortTransaction();
                session.endSession();
                throw new Error("Two of you already be friend!")
            }
            //Check block 
            if (checkFriend.isBlock) {
                await session.abortTransaction();
                session.endSession();
                throw new Error("cant not sent request because this friend relationship has been block")
            }
            //Check friend Request From
            if (checkFriend._friendRequestFrom === senderSlug) {
                await session.abortTransaction();
                session.endSession();
                throw new Error("You already sent request!")
            }
            if (checkFriend._friendRequestFrom === reciverSlug) {
                await session.abortTransaction();
                session.endSession();
                throw new Error(`${senderSlug} already recived a request from ${reciverSlug}`)
            }
            //update friend Request 
            const updateRes = await db.collection(collectionNames.friends).updateOne(checkFriendQuery , { $set: { _friendRequestFrom: senderSlug } },{ session })
            console.log({modifiedCount:updateRes})
            if (updateRes.modifiedCount !== 1) {
                await session.abortTransaction();
                session.endSession();
                throw new Error("Update Friends Collection Failed!")
            }
            await session.commitTransaction()
            await session.endSession()
            return {
                success: true,
                message: `${senderSlug} sent a friend request to ${reciverSlug}`,
                data: null
            }
        }
        //Create new friend document
        const now = new Date()
        const newFriendDocument: Friend = {
            slug1: senderSlug > reciverSlug ? senderSlug : reciverSlug,
            slug2: senderSlug <= reciverSlug ? senderSlug : reciverSlug,
            lastRequestSentAt: now,
            beFriendAt: null,
            isFriend: false,
            isBlock: false,
            _friendRequestFrom: senderSlug,
            _blockRequest: []
        }
        console.log({newFriendDocument})
        const { insertedId } = await db.collection(collectionNames.friends).insertOne(newFriendDocument,{ session })
        console.log({insertedId})
        if (!insertedId) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Insert new friend relationship failed!")
        }
        await session.commitTransaction()
        await session.endSession()
        return {
            success: true,
            message: "Send request successful!",
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
export { friend_send_request }