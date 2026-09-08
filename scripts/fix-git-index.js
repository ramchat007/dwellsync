const fs = require("fs");
const { execSync } = require("child_process");

try {
  // 1. Remove stale index.lock if present
  if (fs.existsSync(".git/index.lock")) {
    fs.unlinkSync(".git/index.lock");
    console.log("[fix-git] Removed stale .git/index.lock");
  }

  // 2. Check and remove corrupted or existing index
  if (fs.existsSync(".git/index")) {
    const stats = fs.statSync(".git/index");
    console.log(`[fix-git] Current .git/index size: ${stats.size} bytes`);
    fs.unlinkSync(".git/index");
    console.log("[fix-git] Removed .git/index for clean rebuild.");
  } else {
    console.log("[fix-git] No .git/index found.");
  }

  // 3. Remove corrupt backup if present
  if (fs.existsSync(".git/index.corrupt.backup")) {
    fs.unlinkSync(".git/index.corrupt.backup");
  }

  // 4. Rebuild index from HEAD
  execSync("git reset", { stdio: "inherit" });
  console.log("[fix-git] Successfully rebuilt .git/index from HEAD!");
} catch (err) {
  console.error("[fix-git] Failed to rebuild git index:", err.message);
  process.exit(1);
}
