import { genSaltSync, hash, hashSync, compareSync } from "bcrypt";
import { decode } from "jsonwebtoken";
import md5 from "md5";
import { ClientSession, ObjectID } from "mongodb";
import { secretCombinePairKey } from "./config";
import { RoomInMongo } from "./models/Room";
import { UserInMongo } from "./models/User";
import { collectionNames, db } from "./mongo";

export const createInboxRoomKey = async (slug1: string, slug2: string) => {
  if (slug1 > slug2) {
    let combine = [slug1, secretCombinePairKey, slug2];
    let combineString = JSON.stringify(combine);
    let combineEncoded = md5(combineString);
    console.log({ combineEncoded });
    return combineEncoded;
  }
  let combine = [slug2, secretCombinePairKey, slug1];
  let combineString = JSON.stringify(combine);
  let combineEncoded = md5(combineString);
  console.log({ combineEncoded });
  return combineEncoded;
};

export const checkRoomIdInMongoInMutation = async (
  objectRoomId: ObjectID,
  session: ClientSession
): Promise<RoomInMongo> => {
  const RoomData = await db
    .collection(collectionNames.rooms)
    .findOne({ _id: objectRoomId }, { session });
  console.log({ RoomData });
  if (!RoomData) {
    await session.abortTransaction();
    session.endSession();
    throw new Error("RoomId not exist");
  }
  const result: RoomInMongo = RoomData;
  return result;
};

export const testBcrypt = () => {
  console.log("Test bcrypt");
  const saltRounds = 10;
  const myPlaintextPassword = "s0//P4$$w0rD";
  const someOtherPlaintextPassword = "not_bacon";
  const salt = genSaltSync(saltRounds);
  console.log({ salt });
  const hash = hashSync(myPlaintextPassword, salt);
  console.log({ hash });
  console.log({ resultTrue: compareSync(myPlaintextPassword, hash) });
  console.log({ resultFalse: compareSync(someOtherPlaintextPassword, hash) });
};

export const getSlugFromToken = (token: string): string | null => {
  //decode token
  let decoded = decode(token);
  if (!decoded) return null;
  //Check token slug in Mongo
  //Check token slug in AccountService
  return "Success";
};

export const checkSlugsExistInDatabase = async (
  slugs: String[],
  session?: ClientSession
): Promise<Boolean> => {
  //Check in mongo
  let findUsersRes: UserInMongo[];
  if (session) {
    findUsersRes = await db
      .collection(collectionNames.users)
      .find({ slug: { $in: slugs } }, { session })
      .toArray();
  } else {
    findUsersRes = await db
      .collection(collectionNames.users)
      .find({ slug: { $in: slugs } })
      .toArray();
  }
  const slugsFindInMongo = findUsersRes.map((user) => user.slug);
  const slugsLeft = slugs.filter((slug) => !slugsFindInMongo.includes(slug));
  if (findUsersRes.length !== slugs.length) {
    //Check in Account Service Server}
    //If slugs exist in Account Service Server => save Data to Mongo
    throw new Error("Have slug not exist in database");
  }
  return true;
};
