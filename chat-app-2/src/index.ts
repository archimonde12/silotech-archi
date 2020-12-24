
import { initApollo} from "./apollo";
import { connectMongoDb, initMongodb } from "./mongo"


const start = async () => {
  await connectMongoDb();
  await initApollo();
  
  await initMongodb()
};

start();
