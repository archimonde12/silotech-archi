
import { initApollo } from "./apollo";
import { connectBrickConsumer } from "./kafka";
import { connectMongoDb, initMongodb } from "./mongo"


const start = async () => {
  try {
    await connectMongoDb();
    await initApollo();
    await initMongodb()
    await connectBrickConsumer()
  } catch (e) {
    throw e
  }
};

start();
