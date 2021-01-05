import { collectionNames, db } from "../../../mongo";

const chat_search_users = async (root: any, args: any, ctx: any) => {
  console.log("===GET ALL FRIEND REQUESTS===");
  //Get arguments
  console.log({ args });
  const { text, limit = 20 } = args;
  const textLowerCase = text.toLowerCase();
  if (!textLowerCase && !textLowerCase.trim()) return [];
  const query = { slug: { $regex: text } };
  const allUserQuery = await db
    .collection(collectionNames.users)
    .find(query)
    .limit(limit)
    .toArray();
  return allUserQuery;
};
export { chat_search_users };
