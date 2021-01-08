import { GLOBAL_KEY } from "../config"
import { Member, MemberGlobal } from "../models/Member"
import { GlobalRoomInMongo } from "../models/Room"
import { UserInMongo } from "../models/User"
import { collectionNames, db } from "../mongo"



const userReducer = (user: UserInMongo, globalRoomName: string) => {
    let result: MemberGlobal
    result = {
        slug: user.slug,
        roomId: globalRoomName,
        joinedAt: new Date(),
        role: 'member'
    }
    return result
}


const InitGlobalRooms = async (globalRoomName: string) => {
    console.log(`TRY TO CREATE GLOBAL ROOM WITH NAME = ${globalRoomName}`)
    //Create global rooms
    const GlobalRoomDocument: GlobalRoomInMongo = {
        _id: globalRoomName,
        totalMembers: 0,
        type: "global",
        updatedAt: new Date(),
        lastMess: null
    }
    const checkGlobalExist = await db.collection(collectionNames.rooms).findOne({ _id: GlobalRoomDocument._id })
    if (!checkGlobalExist) {
        console.log(`Cannot found global room in rooms collection`)
        await db.collection(collectionNames.rooms).insertOne(GlobalRoomDocument)
        console.log(`New global was created`)
        let allUserData: UserInMongo[] = await db.collection(collectionNames.users).find({}).toArray()
        console.log(`${allUserData.length} document(s) was/were found in users collection`)
        const newGlobalMemDocs: MemberGlobal[] = allUserData.map(user => userReducer(user, globalRoomName))
        const insertMemRes = await db.collection(collectionNames.members).insertMany(newGlobalMemDocs)
        console.log(`${insertMemRes.insertedCount} document(s) was/were inserted in members collection`)
        const updateRoomRes = await db.collection(collectionNames.rooms).updateOne({_id:globalRoomName},{$inc:{totalMembers:insertMemRes.insertedCount}})
        console.log(`${updateRoomRes.modifiedCount} document(s) was/were updated in rooms collection`)
    }
    console.log(`Global room has been created.`)
    return
}

const deleteGlobalRooms = async (globalRoomName: string) => {
    const checkGlobalExist = await db.collection(collectionNames.rooms).findOne({ _id: globalRoomName })
    if (checkGlobalExist) {
        //Delete Member
        const delMemRes = await db.collection(collectionNames.members).deleteMany({ roomId: globalRoomName })
        console.log(`${delMemRes.deletedCount} document(s) was/were deleted in members collection`)
        //Delete Message
        const delMesRes = await db.collection(collectionNames.messages).deleteMany({ roomId: globalRoomName })
        console.log(`${delMesRes.deletedCount} document(s) was/were deleted in messages collection`)
        //Delete Member Block
        const delMemBlockRes = await db.collection(collectionNames.blockMembers).deleteMany({ roomId: globalRoomName })
        console.log(`${delMemBlockRes.deletedCount} document(s) was/were deleted in blockMembers collection`)
        //Delete Rooms
        const delRomRes = await db.collection(collectionNames.rooms).deleteOne({ _id: globalRoomName })
        console.log(`${delRomRes.deletedCount} document(s) was/were deleted in delRomRes collection`)
    }
    console.log(`Global room not exist`)
}


export { InitGlobalRooms,deleteGlobalRooms }