const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    if (path === "/") {
      path = "/index.html";
    }

    // Serve all files from ./docs (mirrors GH Pages publish source)
    const file = Bun.file(`./docs${path}`);
    const exists = await file.exists();

    if (exists) {
      return new Response(file);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
