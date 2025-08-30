"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const server = (0, server_1.buildServer)();
async function main() {
    try {
        await server.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`Server listening at http://localhost:3000`);
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
