import { connect, Db, MongoClient, TransactionOptions } from "mongodb";
import { GLOBAL_KEY, mongoUri } from "./config";
import { MessageIndexes } from "./models/Message";
import { GlobalRoomInMongo, RoomIndexes, RoomInMongo } from "./models/Room";
import { MemberIndexes } from "./models/Member";
import { UserInMongoIndexes } from "./models/User";
import { createFakeUserToMongo } from "./initMongo/user";
import { BlockMemberIndexes } from "./models/BlockMember";
import { FriendIndexes } from "./models/Friend"
import { InitGlobalRooms } from "./initMongo/globalRoom";

let client: MongoClient;
let db: Db;

const collectionNames = {
  messages: "messages",
  messageType: "messageType",
  rooms: "rooms",
  roomType: "roomType",
  users: "users",
  members: "members",
  memberRoles: "memberRoles",
  blockMembers: "blockMembers",
  friends: "friends"
};

const transactionOptions: TransactionOptions = {
  readPreference: 'primary',
  readConcern: { level: 'local' },
  writeConcern: { w: 'majority' }
};

const connectMongoDb = async () => {
  try {
    client = await connect(mongoUri, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      ignoreUndefined: true,
    });


    client.on("error", async (e) => {
      try {
        await client.close();
        await connectMongoDb();
      } catch (e) {
        setTimeout(connectMongoDb, 1000);
        throw e;
      }
    });

    client.on("timeout", async () => {
      try {
        await client.close();
        await connectMongoDb();
      } catch (e) {
        setTimeout(connectMongoDb, 1000);
        throw e;
      }
    });

    client.on("close", async () => {
      try {
        await connectMongoDb();
      } catch (e) {
        throw e;
      }
    });

    db = client.db();
    await Promise.all([
      db.collection(collectionNames.members).createIndexes(MemberIndexes),
      db.collection(collectionNames.blockMembers).createIndexes(BlockMemberIndexes),
      db.collection(collectionNames.messages).createIndexes(MessageIndexes),
      db.collection(collectionNames.users).createIndexes(UserInMongoIndexes),
      db.collection(collectionNames.rooms).createIndexes(RoomIndexes),
      db.collection(collectionNames.friends).createIndexes(FriendIndexes)
    ]);
    console.log(`Mongodb: connected`);
  } catch (err) {
    console.error(`Mongodb: disconnected`);
    await client?.close(true);
    setTimeout(connectMongoDb, 1000);
    throw err;
  }
};

const initMongodb = async () => {
  await InitGlobalRooms(GLOBAL_KEY)
  await db.dropCollection("test")
  await db.createCollection("test",{ capped : true, size:4000,  max : 5 } )
  for(let i=1;i<10;i++){
    await db.collection("test").insertOne({hoan:`hoan${i}`})
  }
};

export { client, db, connectMongoDb, initMongodb, collectionNames, transactionOptions }; 
