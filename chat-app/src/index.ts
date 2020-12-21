
import { initApollo} from "./apollo";
import { connectMongoDb } from "./mongo"

const start = async () => {
  await connectMongoDb();
  await initApollo();
};

start();
