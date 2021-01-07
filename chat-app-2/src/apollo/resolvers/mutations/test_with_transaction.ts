import { Client } from "grpc";
import { MongoClient, ObjectId, TransactionOptions } from "mongodb";
import { client, collectionNames, db } from "../../../mongo";
import { checkRoomIdInMongoInMutation } from "../../../ulti";



const test_with_transaction = async () => {
    console.log("===== TEST WITHTRANSACTION FUNCTION =====")
    const roomId = "5ff2ed51695a6f2426cd682e"
    const objectRoomId = new ObjectId(roomId);
    const session = client.startSession();
    const transactionOptions: TransactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' }
    };
    try {
        const transactionResults:any = await session.withTransaction(async () => {
            const {insertedCount,insertedId}=await db.collection("test").insertOne({abc:"def"},{session})
            console.log(`${insertedCount} document(s) was/were inserted in the test collection`)
            //Check roomId exist
            const RoomData = await db.collection(collectionNames.rooms).findOne({ _id: objectRoomId }, { session })
            if(!RoomData){
                await session.abortTransaction()
                console.error(`0 document has found in rooms collection by _id="${objectRoomId}"`)
                return;
            }
            //Check member
            console.log("Keep Going")
            const checkOldMemFilter = {
                $and: [{ roomId: objectRoomId }, { slug: { $in: ["hoan015", "hoan001"] } }],
            };
            const checkOldMembers = await db
                .collection(collectionNames.members)
                .find(checkOldMemFilter, { session })
                .toArray();
        }, transactionOptions)
    
        if (!transactionResults) {
            console.log("The transaction was intentionally aborted.");
        } else {
            console.log("The reservation was successfully created.");
        }
        session.endSession()
    } catch (e) {
        console.log("The transaction was aborted due to an unexpected error: " + e);
        return {
            message:"unexpected error"
        }
    }
}

export { test_with_transaction }