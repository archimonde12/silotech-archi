
import { initApollo} from "./apollo";
import { connectMongoDb } from "./mongo"
import {createFakeUserToMongo} from "./fakeData/user"

const start = async () => {
  await connectMongoDb();
  await initApollo();
  await createFakeUserToMongo()
};

start();
