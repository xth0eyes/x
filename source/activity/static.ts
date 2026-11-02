import { fastify as fast } from "fastify";
import faststatics from "@fastify/static";
import fs from "fs";
import path from "path";

const fastify = fast({ logger: true });
const default_link_path = path.join(__dirname, "..", ".link.txt");
const global_link_path = path.join(__dirname, "..", ".links");

fastify.register(faststatics, {
    root: path.join(__dirname, "..", ".icons"),
    prefix: "/ccdns/"
});

fastify.get("/getLink", async (req, res) => {
    const theLink = fs.readFileSync(default_link_path).toString().trim();
    res.send(theLink);
});

fastify.get("/getLinkFor/:lid", async (req, res) => {
    const link_path = path.join(global_link_path, ((req.params as any).lid ?? "default")) + ".txt";
    const theLink = fs.readFileSync(link_path).toString().trim();
    res.send(theLink);
});

fastify.listen({ port: 8078, host: "127.0.0.1" }, (err, addr) => {
    if (err){
        console.error(err.message);
    }

    console.log(`[+] static server is online on ${addr}`);
});


