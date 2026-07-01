const fs = require("fs");
const path = require("path");

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) return null;

  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [match[1], value];
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return true;
}

function loadEnvFiles(files = [".env.local", ".env"]) {
  const root = process.cwd();
  return files.map((file) => ({ file, loaded: loadEnvFile(path.join(root, file)) }));
}

function cleanEnv(name) {
  return String(process.env[name] || "").trim();
}

function isPlaceholder(value) {
  const clean = String(value || "").trim().toLowerCase();
  return (
    !clean ||
    clean.includes("your-") ||
    clean.includes("replace-with") ||
    clean.includes("example.com") ||
    /^0{16,}$/.test(clean)
  );
}

module.exports = {
  cleanEnv,
  isPlaceholder,
  loadEnvFiles,
};
