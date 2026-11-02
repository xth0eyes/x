import { AdminRole } from "./adminrole";
import { Payment } from "./payment";

export interface EnvTokens {
    scarlett_token: string;
    middlegirl_token: string;
    cservice_token: string;
    chat_id: number;
    temp_chat_id: number;
    ceph_telegram_channel_link: string;
    ceph_telegram_persianguide_link: string;
    bot_wallet: string;
    key: string;
    payment: Payment[];
    admins: AdminRole[];
}
