import { client, collectionNames, db } from "../../../mongo"
import {Users} from "../../../fakeData/user"

const chat_app_public_room_create = async (root: any, args: any, ctx: any): Promise<any> => {
    try {
        console.log({ args })
        const {slug,title,member}=args
        const createdAt=new Date()
        const foundUserInFakeDataBase=Users.find(user=>user.slug===slug)
        if(!foundUserInFakeDataBase){throw new Error("Not exist user")}
        const foundUser=await db.collection(collectionNames.users).findOne({slug})
        console.log({foundUser})
        if(!foundUser){
            const insertUserRes=await db.collection(collectionNames.users).insertOne(foundUserInFakeDataBase)
            console.log({insertedId:insertUserRes.insertedId})
        }
        const insertDoc={
            createBy:{slug},
            title,
            blockMembers:[],
            createdAt
        }
        console.log({insertDoc})
        const {insertedId} =await db.collection(collectionNames.chatRooms).insertOne(insertDoc)
        console.log({insertedId})
        const updateDoc=await db.collection(collectionNames.users).updateOne({slug},{$push:{chatRooms:insertedId}})
        let result = { ...insertDoc,_id:insertedId}
        console.log({ result })
        return result
    } catch (e) {
        throw e
    }
}

export { chat_app_public_room_create }