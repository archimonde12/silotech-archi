import { initApollo } from "./apollo";
import { initGrpcServer } from "./grpc";
import { connectBrickConsumer } from "./kafka";
import { connectMongoDb, initMongodb } from "./mongo";
import { initRedis } from "./redis";

const start = async () => {
  try {
    await connectMongoDb();
    await initMongodb();
    // await deleteGlobalRooms(GLOBAL_KEY)
    await initApollo();
    await initRedis()
    await initGrpcServer()
    await connectBrickConsumer()
  } catch (e) {
    throw e;
  } 
};

start();
