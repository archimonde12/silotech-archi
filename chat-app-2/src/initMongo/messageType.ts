import { MessageTypes } from "../models/Message";
import { collectionNames, db } from "../mongo";

const messageTypes = [
    {
        id: MessageTypes.plaintext.id,
        name: MessageTypes.plaintext.name
    },
]

export const createMessageTypeToMongo = async () => {
    let checkMessageTypeDataExistInMongo = await db.collection(collectionNames.messageType).findOne({ id: messageTypes[0].id })
    console.log({ checkMessageTypeDataExistInMongo: checkMessageTypeDataExistInMongo ? true : false })
    if (!checkMessageTypeDataExistInMongo) {
        let addUsersDataRes = await db.collection(collectionNames.messageType).insertMany(messageTypes)
        console.log("Try to add message type data")
        console.log({ addUsersDataRes })
        return console.log("Update message type data");

    }
    return console.log("message type data already created")
}