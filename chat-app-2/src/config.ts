import { config } from "dotenv";
config();
//MongoDB
if (!process.env.MONGO_URI) throw new Error(`mongo uri must be provided`)
export const mongoUri = process.env.MONGO_URI

//GrapQL 
if (!process.env.GRAPHQL_PORT) throw new Error(`graphql port must be provided`)
export const graphqlPort = process.env.GRAPHQL_PORT

//GRPC 
if (!process.env.GRPC_PORT) throw new Error(`grpc port must be provided`)
export const grpcPort = process.env.GRPC_PORT

//Kafka
if (!process.env.KAFKA_BROKER) throw new Error(`kafka broker must be provided`)
export const kafkaBroker=process.env.KAFKA_BROKER

if(!process.env.KAFA_CLIENT_ID) throw new Error(`kafka client id must be provided`)
export const kafkaClientId=process.env.KAFA_CLIENT_ID

//REDIS
if (!process.env.REDIS_URI) throw new Error(`redis Uri must be provided`)
export const redisUri=process.env.REDIS_URI

if (!process.env.REDIS_PORT) throw new Error(`redis port must be provided`)
export const redisPort=Number(process.env.REDIS_PORT)

if (!process.env.REDIS_AUTH) throw new Error(`redis auth must be provided`)
export const redisAuth=process.env.REDIS_AUTH

//Keys
if (!process.env.SECRET_COMBINE_PAIR_KEY) throw new Error(`grpc port must be provided`)
export const secretCombinePairKey = process.env.SECRET_COMBINE_PAIR_KEY

if (!process.env.ADMIN_KEY) throw new Error(`admin key must be provided`)
export const ADMIN_KEY = process.env.ADMIN_KEY

if (!process.env.GLOBAL_KEY) throw new Error(`global key must be provided`)
export const GLOBAL_KEY=process.env.GLOBAL_KEY

export const NEWS_ROOM="NEWS_ROOM"


