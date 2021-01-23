import { handle_telegram_user_info } from "./handle_telegram_user_info"
import {handle_google_user_info} from "./handle_google_user_info"
import {handle_facebook_user_info} from "./handle_facebook_user_info"

const Mutation = {
  handle_telegram_user_info,
  handle_google_user_info,
  handle_facebook_user_info
};

export { Mutation };
