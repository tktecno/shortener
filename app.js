import fs from "fs/promises";
import http from "http";
import crypto from "crypto";
import path from "path";

const datafile = path.join("datafile", "linkdata.json");

const loadlink = async () => {
  try {
    const data = await fs.readFile(datafile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(datafile, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};

const savelink = async (links) => {
  await fs.writeFile(datafile, JSON.stringify(links));
};

const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    if (req.url === "/") {
      try {
        const data = await fs.readFile("index.html");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      } catch (error) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 page not found");
      }
    } else if (req.url === "/style.css") {
      try {
        const css = await fs.readFile("style.css");
        res.writeHead(200, { "Content-Type": "text/css" });
        res.end(css);
      } catch (error) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("CSS File Not Found");
      }
    }else if (req.url === "/links") {
        // serve JSON links BEFORE catch-all
        const links = await loadlink();
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(links));
      } else {
        // handle short code redirect or 404 here
        const links = await loadlink();
        const shortCode = req.url.slice(1);
        if (links[shortCode]) {
          res.writeHead(301, { Location: links[shortCode] });
          res.end();
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
        }
    }
}

  if (req.method === "POST" && req.url === "/shortner") {
    const links = await loadlink();
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const { url, shortCode } = JSON.parse(body);

        if (!url) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("URL is Required");
          return;
        }

        const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");

        if (links[finalShortCode]) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Short code already exists. Please choose another.");
          return;
        }

        links[finalShortCode] = url;
        await savelink(links);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, shortCode: finalShortCode }));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON data");
      }
    });
  }
});

server.listen(3002, () => {
  console.log("server is running now");
});
