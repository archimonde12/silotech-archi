import { collectionNames, db } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const chat_get_all_friends = async (root: any, args: any, ctx: any) => {
    console.log("===GET ALL FRIENDS===")
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization
    const { limit=10, skip=0 } = args;
    try {
         //Verify token and get slug
         const slug = await getSlugByToken(token)
        //Query all friends of slug
        const query = { $or: [{ slug1: slug }, { slug2: slug }],isFriend:true}
        const getAllFriendsRes = await db.collection(collectionNames.friends).find(query).limit(limit).skip(skip).toArray()
        // console.log(`${getAllFriendsRes.length} document(s) was/were found in the friends collection`)
        const allFriends=getAllFriendsRes.map(friendContract => friendContract.slug1 === slug ? {slug:friendContract.slug2} : {slug:friendContract.slug1})
        console.log({ allFriends})
        return allFriends
    }
    catch (e) {
        throw e
    }

}
export { chat_get_all_friends }