import { collectionNames, db } from "../../../mongo"

const chat_app_show_all_inboxroom = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======QUERY ALL MY INBOXROOMS=====")
    //Get arguments
    console.log({ args })
    const { slug } = args
    try {
        //Get user data
        const userData = await db.collection(collectionNames.users).findOne({ slug })
        console.log({ userData })
        if (userData) {
            //Get all inboxrooms in userdata
            const {inboxRooms}=userData
            const inboxRoomsQuery={_id:{$in:inboxRooms}}
            const allMyInboxRooms=await db.collection(collectionNames.inboxRooms).find(inboxRoomsQuery).sort({updateAt:-1}).toArray()
            console.log({allMyInboxRooms})
            return allMyInboxRooms.filter(item=>item.createdAt.toString()!==item.updateAt.toString())
        }
        throw new Error(`${slug} data not exist`)
    } catch (e) {
        throw e
    }
}
export { chat_app_show_all_inboxroom }