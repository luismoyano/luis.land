// Start Hugo in watch mode, outputting to docs/blog/
const hugo = Bun.spawn(
  ["hugo", "--watch", "--environment", "development", "--destination", "../docs/blog"],
  {
    cwd: "./blog",
    stdout: "pipe",
    stderr: "pipe",
  }
);

let hugoReady = false;

// Forward Hugo logs with a prefix; detect when initial build is done
(async () => {
  for await (const chunk of hugo.stdout) {
    const text = new TextDecoder().decode(chunk);
    process.stdout.write("[hugo] " + text);
    if (!hugoReady && text.includes("Built in")) {
      hugoReady = true;
      startServer();
    }
  }
})();
(async () => {
  for await (const chunk of hugo.stderr) {
    process.stderr.write("[hugo] " + new TextDecoder().decode(chunk));
  }
})();

function startServer() {
  const server = Bun.serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);
      let path = url.pathname;

      if (path === "/") {
        path = "/index.html";
      }

      // Serve all files from ./docs (mirrors GH Pages publish source)
      // Resolve directories to their index.html (like GitHub Pages does)
      let filePath = `./docs${path}`;
      let file = Bun.file(filePath);
      if (!(await file.exists())) {
        file = Bun.file(`${filePath}/index.html`);
      }
      const exists = await file.exists();

      if (exists) {
        return new Response(file);
      }

      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`Server running at http://localhost:${server.port}`);
}

process.on("exit", () => hugo.kill());
process.on("SIGINT", () => process.exit());

