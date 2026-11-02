export interface IncomingMessage {
    text: string;
    operator?: string;
    from_number?: string;
    from_name?: string;
    sim_slot?: number;
    sms_type?: "INBOX" | "OUTBOX";
}


