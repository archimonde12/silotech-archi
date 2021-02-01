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
import { InitNewsRoom } from "./initMongo/newsRoom";
import { cron_auto_delete_logs } from "./cron";

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
  friends: "friends",
  logs: "logs"
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
    const allCollections = await db.listCollections().toArray()
    const allCollectionsName: string[] = allCollections.map(collection => collection.name)
    // Create logs collection
    if (!allCollectionsName.includes(collectionNames.logs)) {
      db.createCollection("logs", { capped: true, size: 100000000, max: 1000000 })
    }

    console.log(`🌐 Mongodb: connected`);
  } catch (err) {
    console.error(`Mongodb: disconnected`);
    await client?.close(true);
    setTimeout(connectMongoDb, 1000);
    throw err;
  }
};

const initMongodb = async () => {
  try {
    Promise.all([InitGlobalRooms(GLOBAL_KEY), InitNewsRoom()])
  }
  catch (e) {
    throw e
  }
};

export { client, db, connectMongoDb, initMongodb, collectionNames, transactionOptions }; 
