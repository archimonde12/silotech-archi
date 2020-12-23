import { collectionNames, db } from "../../../mongo"

const chat_app_show_all_my_chatrooms = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======QUERY ALL MY CHATROOMS=====")
    //Get arguments
    console.log({ args })
    const { slug } = args
    try {
        //Get user data
        const userData = await db.collection(collectionNames.users).findOne({ slug })
        console.log({userData})
        if (userData) {
            //Get all chatrooms in userdata
            const {chatRooms}=userData
            const chatRoomsQuery={_id:{$in:chatRooms}}
            const allMyChatRooms=await db.collection(collectionNames.chatRooms).find(chatRoomsQuery).sort({updateAt:-1}).toArray()
            console.log({allMyChatRooms})
            return allMyChatRooms
        }
        throw new Error(`${slug} data not exist`)
    } catch (e) {
        throw e
    }
}
export { chat_app_show_all_my_chatrooms }