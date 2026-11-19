// Brings a new Gleamshelf editor into the admin: packs @gleamshelf/react from a Gleamshelf checkout into vendor/, points package.json at it,
// installs it, and removes the old copy.
//   npm run gleamshelf:update                 (../gleamshelf)
//   npm run gleamshelf:update -- <folder>     (another checkout)
// Raise the version in gleamshelf's packages/react/package.json first: npm keeps the first copy of a version it installed, so a second
// pack under the same version would never reach node_modules. This stops before packing when the version has not changed.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const gleamshelf = resolve(root, process.argv[2] ?? "../gleamshelf");
const vendor = join(root, "vendor");
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });

const sourceManifest = join(gleamshelf, "packages", "react", "package.json");
if (!existsSync(sourceManifest)) {
  console.error(`No Gleamshelf editor at ${gleamshelf}: clone gleamshelf next to spin-hobby, or pass its folder.`);
  process.exit(1);
}
const version = JSON.parse(readFileSync(sourceManifest, "utf8")).version;
const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const current = /gleamshelf-react-(.+)\.tgz$/.exec(pkg.dependencies["@gleamshelf/react"] ?? "")?.[1];
if (current === version) {
  console.error(
    `The admin already has @gleamshelf/react ${version}. Raise the version in ${sourceManifest} first ` +
      "(npm would keep the old copy under the same version).",
  );
  process.exit(1);
}

let branch = "";
try {
  branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: gleamshelf, encoding: "utf8" }).trim();
  const dirty = execSync("git status --porcelain", { cwd: gleamshelf, encoding: "utf8" }).trim();
  if (dirty) console.warn(`\nNote: ${gleamshelf} has uncommitted changes; they are packed too.\n`);
} catch {
  // not a git checkout: pack it as it is
}
console.log(`Packing @gleamshelf/react ${current ?? "(none)"} -> ${version} from ${gleamshelf}${branch ? ` (${branch})` : ""}`);

run(`node scripts/pack-react.mjs "${vendor}"`, gleamshelf);
const tgz = `gleamshelf-react-${version}.tgz`;
if (!existsSync(join(vendor, tgz))) {
  console.error(`The pack left no vendor/${tgz}.`);
  process.exit(1);
}

pkg.dependencies["@gleamshelf/react"] = `file:vendor/${tgz}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
for (const old of readdirSync(vendor)) if (/^gleamshelf-react-.+\.tgz$/.test(old) && old !== tgz) rmSync(join(vendor, old));
run("npm install", root);

console.log(
  `\nThe admin now uses @gleamshelf/react ${version}. Check it with npm run build, then commit vendor/${tgz}, package.json and package-lock.json together.`,
);
