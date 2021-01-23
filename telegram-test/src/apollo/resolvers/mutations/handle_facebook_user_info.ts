import axios from "axios"
/**
 * GraphQL Mutation Function: Handle facebook user info that contain accessToken and userId. That function verify accessToken and send the result to Account Service for signup or login
 * @param root 
 * @param args   The param client send to server include: accessToken, userId
 * @param ctx 
 * @return if everything alright it will return result is OK else return error message
 * @link https://stackoverflow.com/questions/8605703/how-to-verify-facebook-access-token
 */

const handle_facebook_user_info = async (
    root: any,
    args: any,
    ctx: any
): Promise<any> => {
    try {
        const { facebookUserData } = args
        const { accessToken, userID } = facebookUserData
        const uri = `https://graph.facebook.com/${userID}/?access_token=${accessToken}`
        console.log({ uri })
        const response = await axios.get(uri)
        const data = response.data
        console.log({ response })
        console.log({ data })
        if (!data) {
            throw new Error('token expired or invalid (or userID not correct)')
        }
        return {
            error: null,
            result: "OK"
        }
    } catch (err) {
        return {
            error: err.message,
            result: null
        }
    }
}
export { handle_facebook_user_info }