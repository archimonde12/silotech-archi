import { BOT_TOKEN } from "../../../config"
import { Result } from "../../typeDefs/schema"
import { checkHash } from "../../../telegram_auth"

const handle_telegram_user_info = async (
    root: any,
    args: any,
    ctx: any
): Promise<any> => {
    try {
        const { userData } = args
        console.log(userData)
        checkHash(BOT_TOKEN, userData)
        return {
            error: null,
            result: "OK"
        }
    } catch (err) {
        console.log(err)
        return {
            error: err,
            result: null
        }
    }
}
export { handle_telegram_user_info }