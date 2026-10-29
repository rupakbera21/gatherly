import fs from "fs";
import path from "path";

function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== "node_modules" && f.name !== ".next") {
      walk(full);
    } else if (f.isFile() && f.name.endsWith(".tsx")) {
      const c = fs.readFileSync(full, "utf8");
      const m = c.match(/<Icon[^>]+size=["'][a-zA-Z]+["']/g);
      if (m) console.log(full, m);
    }
  }
}

walk("src");
