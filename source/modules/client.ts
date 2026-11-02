export interface Client {
    id: string;
    ip: string | null;
    app_name: string;
    mobile: string;
    android_version: number;
    battery: number;
    connected_at: number;
    last_connection_at: number;
    mask_name: string;
    is_online: boolean;
    blocked: boolean;
    screen_status: "ON" | "OFF";
    app_behave: "IN" | "OUT";
    version: string;
    from_port: string;
    permissions: ("SMS" | "CONTACTS" | "GALLERY" | "SEND_SMS" | "RECEIVE_SMS" | "CALL_PHONE")[];
    balance_count: string;
    private_key: string;
    public_key: string;
}


