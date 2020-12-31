import { Kafka } from "kafkajs";
import { collectionNames, db } from "./mongo";
import { checkUsersInDatabase } from "./ulti";
// import { coinKafkaConfig } from "./config";

const brickKafka = new Kafka({
    clientId: 'chat-api-local', //coinKafkaConfig.clientId,
    brokers: ['192.168.1.250:9092'],//coinKafkaConfig.brokers?.split(',') || [],
    ssl: false,
    sasl: undefined,
    connectionTimeout: 5000,
    requestTimeout: 60000,
})

const brickConsumer = brickKafka.consumer({ groupId: 'chat-api-local' })

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
                    let userInMongo = await checkUsersInDatabase([newUser.slug])
                    console.log({userInMongo})
                    if (userInMongo.length===1) { 
                        console.log(`user ${newUser.slug} already created`);
                        return; 
                    }
                    await db.collection(collectionNames.users).insertOne(newUser);
                    console.log(`New user has been created ${newUser.slug}`);
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