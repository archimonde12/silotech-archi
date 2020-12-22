import { collectionNames, db } from "../mongo";

export const Users = [
  {
    id: 1,
    slug: "batman",
    friend: [],
    block: [],
    chatRooms: [],
    inboxRooms:[]
  },
  {
    id: 2,
    slug: "superman",
    friend: [],
    block: [],
    chatRooms: [],
    inboxRooms:[]
  },
  {
    id: 3,
    slug: "ironman",
    friend: [],
    block: [],
    chatRooms: [],
    inboxRooms:[]
  },
  {
    id: 4,
    slug: "joker",
    friend: [],
    block: [],
    chatRooms: [],
    inboxRooms:[]
  },
  {
    id: 5,
    slug: "aquaman",
    friend: [],
    block: [],
    chatRooms: [],
    inboxRooms:[]
  },
  {
    id: 6,
    slug: "hulk",
    friend: [],
    block: [],
    chatRooms: [],
    inboxRooms:[]
  },
  {
    id: 7,
    slug: "flash",
    friend: [],
    block: [],
    chatRooms: [],
    inboxRooms:[]
  },
  {
    id: 8,
    slug: "storm",
    friend: [],
    block: [],
    chatRooms: [],
    inboxRooms:[]
  },
  {
    id: 9,
    slug: "hawkeye",
    friend: [],
    block: [],
    chatRooms: [],
    inboxRooms:[]
  },
  {
    id: 10,
    slug: "thanos",
    friend: [],
    block: [],
    chatRooms: [],
    inboxRooms:[]
  },
];

export const createFakeUserToMongo = async () => {
  let checkUsersDataExistInMongo = await db.collection(collectionNames.users).findOne({ slug: "batman" })
  console.log({checkUsersDataExistInMongo:checkUsersDataExistInMongo?true:false})
  if (!checkUsersDataExistInMongo) {
    let addUsersDataRes = await db.collection(collectionNames.users).insertMany(Users)
    console.log("Try to add fake users data")
    console.log({ addUsersDataRes })
    return console.log("Update fake user data");
    
  }
  return console.log("Fake users data already created")
}

export const checkSlugExistInDatabase=(slug:string)=>{
  let flag= Users.find(user=>user.slug===slug)
  if(flag){
    return true
  }
  return false
}
