import { typeDefs } from "./typeDefs/schema";
import { resolvers } from "./resolvers";
import { ApolloServer } from "apollo-server";
import { graphqlPort } from "../config"
import { getSlugByToken } from "../ulti";

interface Param{
  authorization:string
}

const initApollo = async () => {
  try {
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      subscriptions: {
        onConnect: async (connectionParams, webSocket) => {
          try {
            const params=connectionParams as Param
            const token = params.authorization 
            if (!token) throw new Error("CA:002")
            await getSlugByToken(token);
          }
          catch (e) {
            throw new Error("CA:003")
          }
        },
      },
      context: (req) => ({
        ...req,
      }),
    });
    const { url } = await server.listen({ port: graphqlPort })
    console.log(`🚀 Apollo server ready at ${url}`);
  }
  catch (e) {
    console.log(`Apollo server disconnect`)
    throw e
  }
};

export { initApollo };