import { initApollo } from "./apollo";
import { connectBrickConsumer } from "./kafka";
import { connectMongoDb } from "./mongo";
import { initRedis } from "./redis";

const start = async () => {
  try {
    await connectMongoDb();
    await initApollo();
    await initRedis()
    await connectBrickConsumer()
  } catch (e) {
    throw e;
  }
};

start();
