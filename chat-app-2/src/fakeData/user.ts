import { collectionNames, db } from "../mongo";

export const Users = [
  {
    slug: "batman",
  },
  {
    slug: "superman",
  },
  {
    slug: "ironman",
  },
  {
    slug: "joker",
  },
  {
    slug: "aquaman",
  },
  {
    slug: "hulk",
  },
  {
    slug: "flash",
  },
  {
    slug: "storm",
  }, 
  {
    slug: "hawkeye",
  },
  {
    slug: "thanos",
  },
];

export const createFakeUserToMongo = async () => {
  let checkUsersDataExistInMongo = await db.collection(collectionNames.users).findOne({ slug: "batman" })
  console.log({ checkUsersDataExistInMongo: checkUsersDataExistInMongo ? true : false })
  if (!checkUsersDataExistInMongo) {
    let addUsersDataRes = await db.collection(collectionNames.users).insertMany(Users)
    console.log("Try to add fake users data")
    console.log({ addUsersDataRes })
    return console.log("Update fake user data");

  }
  return console.log("Fake users data already created")
}

export const checkSlugExistInDatabase = (slug: string) => {
  let flag = Users.find(user => user.slug === slug)
  if (flag) {
    return true
  }
  return false
}
