import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { getSlugByToken } from "../../../ulti";

const chat_get_all_friend_requests = async (root: any, args: any, ctx: any) => {
    try {
        console.log("===GET ALL FRIEND REQUESTS===")
        //Get arguments
        console.log({ args });
        const token = ctx.req.headers.authorization
        const { pageSize = 10, page = 1 } = args;
        if (pageSize < 1 || page < 1) throw new Error("CA:059")
        //Verify token and get slug
        const slug = await getSlugByToken(token)
        //Query all friends of slug
        const query = { $and: [{ $or: [{ slug1: slug }, { slug2: slug }] }, { isFriend: false }, { _friendRequestFrom: { $nin: [slug, null] } }] }
        const getAllFriendRequestsRes = await db.collection(collectionNames.friends).find(query).limit(pageSize).skip((page - 1) * pageSize).toArray()
        console.log(`${getAllFriendRequestsRes.length} document(s) was/were found in the friends collection`)
        const AllFriendRequests = getAllFriendRequestsRes.map(friendContract => friendContract.slug1 === slug ? { slug: friendContract.slug2 } : { slug: friendContract.slug1 })
        console.log({ AllFriendRequests })
        return AllFriendRequests
    }
    catch (e) {
        console.log(e)
        if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
            throw new Error(e.message)
          } else {
            captureExeption(e, { args })
            throw new Error("CA:004")
          }
    }
}
export { chat_get_all_friend_requests }
