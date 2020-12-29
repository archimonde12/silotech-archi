import { connect, Db, MongoClient } from "mongodb";
import { mongoUri } from "./config";
import { MessageIndexes } from "./models/Message";
import { RoomIndexes } from "./models/Room";
import { MemberIndexes } from "./models/Member";
import { UserInMongoIndexes } from "./models/User";
import { createFakeUserToMongo } from "./initMongo/user";
import { BlockMemberIndexes } from "./models/BlockMember";
import { InboxRoomIndexes } from "./models/InboxRoom";

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
  inboxRooms:"inboxRooms"
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
      db
        .collection(collectionNames.blockMembers)
        .createIndexes(BlockMemberIndexes),
      db.collection(collectionNames.messages).createIndexes(MessageIndexes),
      db.collection(collectionNames.users).createIndexes(UserInMongoIndexes),
      db.collection(collectionNames.rooms).createIndexes(RoomIndexes),
      db.collection(collectionNames.inboxRooms).createIndexes(InboxRoomIndexes)
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
  await createFakeUserToMongo();
};

export { client, db, connectMongoDb, initMongodb, collectionNames };
