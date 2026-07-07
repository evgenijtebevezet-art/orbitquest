import { createServer, type ServerResponse } from "node:http";
import { bootstrapResponse } from "./bootstrap.js";

const port = Number(process.env.PORT ?? 8787);

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "GET" && request.url === "/api/bootstrap") {
    sendJson(response, 200, bootstrapResponse);
    return;
  }

  sendJson(response, 404, { error: "not_found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`OrbitQuest API listening on http://127.0.0.1:${port}`);
});
