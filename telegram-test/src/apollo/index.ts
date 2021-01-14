import { typeDefs } from "./typeDefs/schema";
import { resolvers } from "./resolvers";
import { ApolloServer } from "apollo-server";
import {graphqlPort} from "../config"

const initApollo = async () => {
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: (req) => ({
        ...req,
      }),
    });
    const { url } = await server.listen({ port: graphqlPort })
    console.log(`🚀 Apollo server ready at ${url}`);
  };

export { initApollo };