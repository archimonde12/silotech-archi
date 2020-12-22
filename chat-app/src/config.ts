import { config } from "dotenv";
config();

if (!process.env.MONGO_URI) throw new Error(`mongo uri must be provided`)
export const mongoUri = process.env.MONGO_URI

if (!process.env.GRAPHQL_PORT) throw new Error(`graphql port must be provided`)
export const graphqlPort = process.env.GRAPHQL_PORT

if (!process.env.GRPC_PORT) throw new Error(`grpc port must be provided`)
export const grpcPort = process.env.GRPC_PORT

if (!process.env.SECRET_COMBINE_PAIR_KEY) throw new Error(`grpc port must be provided`)
export const secretCombinePairKey = process.env.SECRET_COMBINE_PAIR_KEY

export const errorMessage={
    someUserNotExistInDataBase:`Someone not exist in database!`,
    userNotExistInDataBase:(slug)=>`${slug} not exist in database!`
}