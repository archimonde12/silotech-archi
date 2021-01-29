import { createHmac } from "crypto"
import { BOT_TOKEN } from "./config"
import { TelegramUserData } from "./models/TelegramUserData"
import { createDataCheckStringFromUserData, createSecretKeyFromBotToken } from "./ulti"
/**
 * 
 * @param _botToken token of bot telegram
 * @param _userData data of user after sign in the telegram app
 * @link Formula hash at: https://core.telegram.org/widgets/login
 * @link code example: https://gist.github.com/anonymous/6516521b1fb3b464534fbc30ea3573c2
 */
const checkHash = (_botToken: string, _userData: TelegramUserData) => {
    const checkHash = _userData.hash
    const secret_key = createSecretKeyFromBotToken(BOT_TOKEN)
    const data_check_string = createDataCheckStringFromUserData(_userData)

    const hash = createHmac("sha256", secret_key).update(data_check_string).digest("hex")
    console.log({hash})
    if (hash !== checkHash) {
        throw new Error("This message not be sent by Telegram")
    }
    const now = new Date().getTime()
    const nowInSecond = now / 1000
    const SECONDS_OF_ONE_DAY = 24 * 60 * 60 //Follow PHP Sample code

    if (nowInSecond - _userData.auth_date > SECONDS_OF_ONE_DAY) {
        throw new Error("This token is out of date")
    }
    return
}

export { checkHash }
