import path from "path";
import fsp from "fs/promises";
import { existsSync } from "fs";
import { fastifyStatic } from "@fastify/static";
import { fastify as fast } from "fastify"

const gallery_path = path.join(__dirname, "..", "..", ".gallery");
const fastify = fast();

fastify.register(fastifyStatic, {
    root: gallery_path,
    prefix: "/static/"
});

fastify.get("/get-view/:user_id", async (req, res) => {
    const user_id = req.params ? (req.params as any).user_id : null;

    if (user_id){
        const user_path = path.join(gallery_path, user_id);
        if (!existsSync(user_path)) return res.send([]);
        let dir = await fsp.readdir(user_path);
        dir = dir.map((val) => {
            return `https://talghsamen.ir/static/${user_id}/${val}`;
        });

        return res.send(dir);
    } else {
        return res.send([]);
    }
});

fastify.listen({ host: "127.0.0.1", port: 6546 }, (err, addr) => {
    if (err){
        console.error(err.message);
    }

    console.log(addr);
});


