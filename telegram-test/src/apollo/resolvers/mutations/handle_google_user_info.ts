import { OAuth2Client } from "google-auth-library"
import { googleClientId } from "../../../config";


const client = new OAuth2Client(googleClientId);

const handle_google_user_info = async (
    root: any,
    args: any,
    ctx: any
): Promise<any> => {
    try {
        const { googleUserData } = args
        const { id_token } = googleUserData
        async function verify() {
            const ticket = await client.verifyIdToken({
                idToken: id_token,
                audience: googleClientId,
            });
            const payload: any = ticket.getPayload();
            const userid = payload['sub']
            console.log({ userid })
        }
        verify().catch(console.error);
    } catch (err) {
        console.log(err)
        return {
            error: err,
            result: null
        }
    }
}
export { handle_google_user_info }