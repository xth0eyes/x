import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join as pathJoin } from "path";

const argv = process.argv;
const database_path = pathJoin(__dirname, "mongodbs");

if (argv.includes("-nvm")){
    console.log("[ceph::installer] installing nvm");

    let node_version = "24";

    if (argv.includes("-nvr")){
        const node_version_flag = argv[argv.indexOf("-nvr") + 1];
        if (node_version_flag){
            node_version = node_version_flag;
        }
    }

    console.log("[ceph::installer] node version selected:", [ node_version ]);

    execSync("curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash");
    execSync("source ~/.bashrc");
    execSync("nvm install 24");
    execSync("nvm use 24");

    console.log("[ceph::installer] nvm installed");
    console.log("[ceph::installer] node selected", [ node_version ]);
}

if (argv.includes("-mongo")){
    console.log("[ceph::installer] installing mongodb");

    execSync("sudo apt update -y");
    execSync("sudo apt install -y gnupg curl");
    execSync(`curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
  --dearmor
`);

    execSync(`echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
`);

    execSync("sudo apt-get update -y");
    execSync("sudo apt-get install -y mongodb-org");

    console.log("[ceph::installer] mongodb installed");
}

if (argv.includes("-sub-mongo")){
    console.log("[ceph::installer] configuring database");

    if (!existsSync(database_path)) mkdirSync(database_path, { recursive: true });

    writeFileSync(pathJoin(__dirname, "mng.js"), `
const { exec } = require("child_process");

exec("mongod --dbpath ${database_path}");
`);

    console.log("[ceph::installer] database is running");
}

if (argv.includes("-sub-pm2")){
    console.log("[ceph::installer] running dist/activity/* with pm2");

    execSync("pm2 start dist/activity/bot.js");
    execSync("pm2 start dist/activity/up.js");
    execSync("pm2 start dist/activity/static.js");
    execSync("pm2 start dist/activity/webapp/path_viewer.js");
    execSync("pm2 start mng.js");
}

if (argv.includes("-nginx")){
    console.log("[ceph::installer] installing nginx");

    execSync("sudo apt install nginx -y");
    writeFileSync("/etc/nginx/sites-enabled/cephapi", `
server {
    listen 80;
    server_name talghsamen.ir;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name talghsamen.ir;

    ssl_certificate     /etc/letsencrypt/live/talghsamen.ir/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/talghsamen.ir/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    access_log /var/log/nginx/talghsamen.ir.access.log;
    error_log  /var/log/nginx/talghsamen.ir.error.log;

    server_tokens off;

    client_max_body_size 500M;
    client_body_timeout 120s;

    location /websocket {
        proxy_pass http://127.0.0.1:4343;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 31536000s;
        proxy_send_timeout 31536000s;
        proxy_buffering off;
    }

    location /static/ {
        proxy_pass http://127.0.0.1:6546;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/get-view/(.+)$ {
        proxy_pass http://127.0.0.1:6546/get-view/$1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/view-by/(.+)$ {
        proxy_pass http://127.0.0.1:6545/web.html/view-by/$1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /telegramWebhook {
        proxy_pass http://127.0.0.1:6443/telegramWebhook;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /getLink {
        proxy_pass http://127.0.0.1:8078/getLink;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/getLinkFor/(.+)$ {
        proxy_pass http://127.0.0.1:8078/getLinkFor/$1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /g {
        proxy_pass http://127.0.0.1:3000/g;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_read_timeout 300s;
    }

    location = /c {
        proxy_pass http://127.0.0.1:3000/c;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_read_timeout 300s;
    }

    location = /upload-zip {
        proxy_pass http://127.0.0.1:3000/upload-zip;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_read_timeout 600s;
    }

    location / {
        return 404 "Not Found";
        add_header Content-Type text/plain;
    }
}`);

    console.log("[ceph::installer] nginx configuration has wrote");
}



