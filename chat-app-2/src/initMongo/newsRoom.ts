import { NEWS_ROOM } from "../config"
import { NewsRoomInMongo } from "../models/Room"
import { collectionNames, db } from "../mongo"

const InitNewsRoom = async () => {
    try {
        console.log(`🌱 Try to create New Room`)
        //Create News rooms
        const NewsRoomDocument: NewsRoomInMongo = {
            _id: NEWS_ROOM,
            type: "news",
            updatedAt: new Date(),
            lastMess: null
        }
        const checkNewsRoomExist: NewsRoomInMongo | null = await db.collection(collectionNames.rooms).findOne({ _id: NewsRoomDocument._id })

        if (!checkNewsRoomExist) {
            console.log('Cannot found news room in rooms collection')
            await db.collection(collectionNames.rooms).insertOne(NewsRoomDocument)
            console.log(`News room was created`)
        }
        console.log(`News room has been created.`)
        return
    } catch (e) {
        throw e
    }

}

export {InitNewsRoom}