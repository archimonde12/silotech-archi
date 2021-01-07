import { collectionNames, db } from "../../../mongo";

const chat_search_users = async (root: any, args: any, ctx: any) => {
  console.log("===GET ALL FRIEND REQUESTS===");
  //Get arguments
  console.log({ args });
  const { text, limit = 7 } = args;
  const searchText = new RegExp(`${text}`,'i')
  console.log({searchText})
  //const query = { slug: { $regex: textLowerCase } };
  const query = { slug: {$regex:text } };

  const allUserQuery = await db
    .collection(collectionNames.users)
    .find(query)
    .limit(limit)
    .toArray();

  return allUserQuery;
};
export { chat_search_users };
