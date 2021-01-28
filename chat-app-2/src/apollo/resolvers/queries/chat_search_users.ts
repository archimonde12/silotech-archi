import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";

const chat_search_users = async (root: any, args: any, ctx: any) => {
  try {
    console.log("===GET ALL FRIEND REQUESTS===");
    //Get arguments
    console.log({ args });
    const { text, limit = 7 } = args;
    if(!text||text.strim()) throw new Error("CA:060")
    if(limit<1) throw new Error("CA:061")
    const searchText = new RegExp(`${text}`, 'i')
    console.log({ searchText })
    //const query = { slug: { $regex: textLowerCase } };
    const query = { slug: { $regex: text } };

    const allUserQuery = await db
      .collection(collectionNames.users)
      .find(query)
      .limit(limit)
      .toArray();

    return allUserQuery;
  } catch (e) {
    console.log(e)
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      captureExeption(e, { args })
      throw new Error("CA:004")
    }
  }
};
export { chat_search_users };
