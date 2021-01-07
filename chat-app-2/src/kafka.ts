import { Kafka } from "kafkajs";
import { kafkaBroker, kafkaClientId } from "./config";
import { collectionNames, db } from "./mongo";
import { setAsync } from "./redis";
import { checkUsersInDatabase } from "./ulti";

const brickKafka = new Kafka({
    clientId: kafkaClientId, //coinKafkaConfig.clientId,
    brokers: [kafkaBroker],//coinKafkaConfig.brokers?.split(',') || [],
    ssl: false,
    sasl: undefined,
    connectionTimeout: 5000,
    requestTimeout: 60000,
})

const brickConsumer = brickKafka.consumer({ groupId: kafkaClientId })

const connectBrickConsumer = async () => {
    try {
        await brickConsumer.connect()

        console.log(`brick consumer connected`)

        await brickConsumer.subscribe({ topic: 'user_signup', fromBeginning: true })

        console.log(`brick consumer subscribed topic: user_signup`)

        await brickConsumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const value = message?.value?.toString()
                    if (!value) throw new Error("cannot get value")
                    const newUser = JSON.parse(value).data
                    //Check in mongo
                    let userInMongo = await checkUsersInDatabase([newUser.slug])
                    console.log({userInMongo})
                    if (userInMongo.length===1) { 
                        console.log(`user ${newUser.slug} already created`);
                        return; 
                    }
                    //Create new one in mongo if not exist
                    const {insertedCount,insertedId}=await db.collection(collectionNames.users).insertOne(newUser);
                    console.log(`${insertedCount} new user document was inserted in the users collection with _id='${insertedId}'`);
                    //Save to redis
                    const key=`chat-api.users.${newUser.slug}`
                    const redisSetRes=await setAsync(key,JSON.stringify(newUser))
                    if(!redisSetRes) console.log("Fail to saving in Redis")
                    console.log(`New userv value has been created ${newUser.slug} in Redis with key='${key}'`);
                    return;
                } catch (e) {
                    throw e
                }
            }
        })

    } catch (e) {
        console.error(`brick consumer disconnected`)
        throw e
    }
}

export {
    connectBrickConsumer
}