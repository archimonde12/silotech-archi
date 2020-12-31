import { collectionNames, db } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const get_all_friends = async (root: any, args: any, ctx: any) => {
    console.log("===GET ALL FRIENDS===")
    //Get arguments
    console.log({ args });
    const { token, limit, skip } = args;
    if (!token.trim()) throw new Error("token must be provided")
    try {
         //Verify token and get slug
         const slug = await getSlugByToken(token)
        //Query all friends of slug
        const query = { $or: [{ slug1: slug }, { slug2: slug }] }
        const getAllFriendsRes = await db.collection(collectionNames.friends).find(query).limit(limit?limit:10).skip(skip?skip:0).toArray()
        const allFriends=getAllFriendsRes.map(friendContract => friendContract.slug1 === slug ? {slug:friendContract.slug2} : {slug:friendContract.slug1})
        console.log({ allFriends})
        return allFriends
    }
    catch (e) {
        throw e
    }

}
export { get_all_friends }