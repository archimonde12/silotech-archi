import { collectionNames, db } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const chat_get_all_friend_requests = async (root: any, args: any, ctx: any) => {
    console.log("===GET ALL FRIEND REQUESTS===")
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization
    const { limit=10, skip=0 } = args;
    if (!token||!token.trim()) throw new Error("token must be provided")
    try {
        //Verify token and get slug
        const slug = await getSlugByToken(token)
        //Query all friends of slug
        const query = { $and: [{ $or: [{ slug1: slug }, { slug2: slug }] }, { isFriend: false }, { _friendRequestFrom: { $nin: [slug, null] } }] }
        const getAllFriendRequestsRes = await db.collection(collectionNames.friends).find(query).limit(limit).skip(skip).toArray()
        const AllFriendRequests = getAllFriendRequestsRes.map(friendContract => friendContract.slug1 === slug ? { slug: friendContract.slug2 } : { slug: friendContract.slug1 })
        console.log({ AllFriendRequests })
        return AllFriendRequests
    }
    catch (e) {
        throw e
    }
}
export { chat_get_all_friend_requests }
