import { OAuth2Client } from "google-auth-library"
import { googleClientId } from "../../../config";


const client = new OAuth2Client(googleClientId);

const handle_google_user_info = async (
    root: any,
    args: any,
    ctx: any
): Promise<any> => {
    try {
        //Google Documentation : https://developers.google.com/identity/sign-in/web/backend-auth
        const { googleUserData } = args
        const { id_token } = googleUserData
        const ticket = await client.verifyIdToken({
            idToken: id_token,
            audience: googleClientId,
        });
        const payload: any = ticket.getPayload();
        console.log({payload})
        //Example payload /Users/hoan/silotech/silotech-archi/telegram-test/src/model example/GooglePayload.ts
        return {
            error:null,
            result:{payload}
        }
    } catch (err) {
        return {
            error: err,
            result: null
        }
    }
}
export { handle_google_user_info }