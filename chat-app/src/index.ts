import { ApolloServer } from "apollo-server";
import { typeDefs, resolvers } from "./graphql";

const initApollo = () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: (req) => ({
      ...req,
    }),
  });

  server.listen().then(({ url }) => {
    console.log(`
                Server is running!
                Listening on ${url}
                Explore at https://studio.apollographql.com/dev
              `);
  });
};

const start = () => {
  initApollo();
};

start();
