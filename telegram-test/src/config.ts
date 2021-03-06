import {config} from 'dotenv';

config();

//Telegram bot
if(!process.env.BOT_NAME) throw new Error('bot name must provided')
export const BOT_NAME=process.env.BOT_NAME
if(!process.env.BOT_USERNAME) throw new Error('bot username must provided')
export const BOT_USERNAME=process.env.BOT_USERNAME
if(!process.env.BOT_TOKEN) throw new Error('bot token must provided')
export const BOT_TOKEN=process.env.BOT_TOKEN

//GrapQL 
if (!process.env.GRAPHQL_PORT) throw new Error(`graphql port must be provided`)
export const graphqlPort = process.env.GRAPHQL_PORT

if (!process.env.GOOGLE_CLIENT_ID) throw new Error(`googleClientId port must be provided`)
export const googleClientId=process.env.GOOGLE_CLIENT_ID
if (!process.env.GOOGLE_CLIENT_SECRET) throw new Error(`googleClientSecret port must be provided`)
export const googleClientSecret=process.env.GOOGLE_CLIENT_SECRET