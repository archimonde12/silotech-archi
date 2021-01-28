import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";
import { getSlugByToken } from "../../../ulti";

const chat_get_all_friends = async (root: any, args: any, ctx: any) => {
    try {
        console.log("===GET ALL FRIENDS===")
        //Get arguments
        console.log({ args });
        const token = ctx.req.headers.authorization
        const { pageSize = 10, page = 1 } = args;
        if (pageSize < 1 || page < 1) throw new Error("CA:059")
        //Verify token and get slug
        const slug = await getSlugByToken(token)
        //Query all friends of slug
        const query = { $or: [{ slug1: slug }, { slug2: slug }], isFriend: true }
        const getAllFriendsRes = await db.collection(collectionNames.friends).find(query).limit(pageSize).skip(page * pageSize).toArray()
        // console.log(`${getAllFriendsRes.length} document(s) was/were found in the friends collection`)
        const allFriends = getAllFriendsRes.map(friendContract => friendContract.slug1 === slug ? { slug: friendContract.slug2 } : { slug: friendContract.slug1 })
        console.log({ allFriends })
        return allFriends
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
export { chat_get_all_friends }