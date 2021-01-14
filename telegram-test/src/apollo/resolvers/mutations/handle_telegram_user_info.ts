import { Result } from "../../typeDefs/schema"

const handle_telegram_user_info = async (
    root: any,
    args: any,
    ctx: any
): Promise<any> => {
    const { user } = args
    console.log(user)
    // let result: Result = {
    //     error: "",
    //     result: ""
    // }
    // if (!user) {
    //     result.error = "Error"
    //     return result
    // }
    // result.result = "OK"
    return {
        error:"hello",
        result:"hello"
    }
}
export { handle_telegram_user_info }