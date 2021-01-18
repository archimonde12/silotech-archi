import { createHash } from "crypto";
import { TelegramUserData } from "./models/TelegramUserData";

export function createSecretKeyFromBotToken(_botToken: string): Buffer {
    const hashBotTokenResult = createHash("sha256")
        .update(_botToken)
        .digest("hex");
    return Buffer.from(hashBotTokenResult, 'hex')
}

export function createDataCheckStringFromUserData(user_data: TelegramUserData): string {
    delete user_data.hash
    const key = Object.keys(user_data).map(key => `${key}=${user_data[key]}`)
    key.sort()
    return key.join(`\n`)
}