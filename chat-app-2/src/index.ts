
import { initApollo } from "./apollo";
import { connectBrickConsumer } from "./kafka";
import { connectMongoDb } from "./mongo"


const start = async () => {
  try {
    await connectMongoDb();
    await initApollo();
    await connectBrickConsumer()
  } catch (e) {
    throw e
  }
};

start();
