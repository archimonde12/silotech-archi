import { typeDefs } from "./typeDefs/schema";
import { resolvers } from "./resolvers";
import { ApolloServer } from "apollo-server";
import { graphqlPort } from "../config"
import { getSlugByToken, saveErrorLog, saveRequestLog, saveSuccessLog } from "../utils";
import { getClientIp } from "@supercharge/request-ip/dist";
import { increaseTicketNo, ticketNo } from "../models/Log";

interface Param {
  authorization: string
}

const initApollo = async () => {
  try {
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      subscriptions: {
        onConnect: async (connectionParams, webSocket) => {
          const ticket = `${new Date().getTime()}.${ticketNo}.subscriptions`
          increaseTicketNo()
          try {
            //Create request log
            saveRequestLog(ticket, {}, "subscriptions", "unknown")
            const params = connectionParams as Param
            const token = params.authorization
            if (!token) throw new Error("CA:002")
            await getSlugByToken(token);
            //Create success log
            saveSuccessLog(ticket, {}, "subscriptions", "subscriptions success", "unknown")
          }
          catch (e) {
            //Create error logs
            const errorResult = JSON.stringify({
              name: e.name,
              message: e.message,
              stack: e.stack
            })
            saveErrorLog(ticket, {}, "subscriptions", errorResult, "unknown")
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