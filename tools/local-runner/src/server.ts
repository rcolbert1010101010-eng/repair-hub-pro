import express from "express";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { parsePatch, applyPatch } from "diff";

const app = express();
app.use(express.json({ limit: "5mb" }));

// Repo root is two levels up from tools/local-runner
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

function resolveWithinRepo(relPath: string) {
  const abs = path.resolve(REPO_ROOT, relPath);
  const rel = path.relative(REPO_ROOT, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path escapes repo root");
  }
  return abs;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, repoRoot: REPO_ROOT });
});

app.post("/tools/read_file", (req, res) => {
  const body = z.object({ path: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  try {
    const abs = resolveWithinRepo(body.data.path);
    const text = fs.readFileSync(abs, "utf8");
    res.json({ path: body.data.path, bytes: Buffer.byteLength(text, "utf8"), text });
  } catch (e: any) {
    res.status(400).json({ error: String(e?.message ?? e) });
  }
});

app.post("/tools/search_repo", (req, res) => {
  const body = z.object({ query: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const RG_BIN = path.resolve(process.cwd(), "bin", "rg.exe");
  const rgCmd = fs.existsSync(RG_BIN) ? RG_BIN : "rg";

  const rgArgs = ["-n", "--hidden", "--glob", "!.git/*", body.data.query, REPO_ROOT];

  const child = spawn(rgCmd, rgArgs, { shell: false, windowsHide: true });

  let out = "";
  let err = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (err += d.toString()));

  child.on("close", (code) => {
    if (code !== 0 && !out) {
      return res.status(500).json({
        error: "search failed (is ripgrep available?)",
        exitCode: code,
        stderr: err.trim(),
      });
    }
    const lines = out.split(/\r?\n/).filter(Boolean).slice(0, 2000);
    res.json({ query: body.data.query, results: lines });
  });
});

app.post("/tools/apply_patch", (req, res) => {
  const body = z.object({ diff: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  try {
    const patches = parsePatch(body.data.diff as any);
    if (!patches || patches.length === 0) {
      return res.status(400).json({ error: "No patch hunks found." });
    }

    const files: Array<{ path: string; ok: boolean }> = [];

    for (const p of patches as any[]) {
      const rawName =
        (p.newFileName && p.newFileName !== "/dev/null" ? p.newFileName : p.oldFileName) || "";
      if (!rawName) continue;

      const relPath = rawName.replace(/^[ab]\//, "");
      const abs = resolveWithinRepo(relPath);

      const oldText = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
      const nextText = applyPatch(oldText, p, { fuzzFactor: 20 });

      if (nextText === false) {
        return res.status(400).json({ error: "Patch did not apply cleanly", file: relPath });
      }

      fs.writeFileSync(abs, nextText, "utf8");
      files.push({ path: relPath, ok: true });
    }

    return res.json({ ok: true, files });
  } catch (e: any) {
    return res.status(400).json({ error: String(e?.message ?? e) });
  }
});

const RUN_SCHEMA = z.object({ command: z.string().min(1) });

const ALLOWED_PREFIXES = ["npm ", "npx ", "git "];
const DENY_SUBSTRINGS = ["rm ", "del ", "rmdir", "format", "shutdown", "reboot", "curl", "wget", "|", "&&", ";", "powershell -enc"];

app.post("/tools/run", (req, res) => {
  const parsed = RUN_SCHEMA.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const command = parsed.data.command.trim();

  if (!ALLOWED_PREFIXES.some((p) => command === p.trim() || command.startsWith(p))) {
    return res.status(400).json({ error: `Command not allowed. Allowed prefixes: ${ALLOWED_PREFIXES.join(", ")}` });
  }
  if (DENY_SUBSTRINGS.some((s) => command.toLowerCase().includes(s))) {
    return res.status(400).json({ error: "Command blocked by safety rules." });
  }

  const child = spawn(command, {
    cwd: REPO_ROOT,
    shell: true,
    windowsHide: true,
    env: process.env,
  });

  let stdout = "";
  let stderr = "";

  const killTimer = setTimeout(() => {
    child.kill();
  }, 5 * 60 * 1000);

  child.stdout.on("data", (d) => (stdout += d.toString()));
  child.stderr.on("data", (d) => (stderr += d.toString()));

  child.on("close", (code) => {
    clearTimeout(killTimer);
    res.json({ command, exitCode: code, stdout, stderr });
  });
});


app.post("/tools/replace_in_file", (req, res) => {
  const body = z.object({
    path: z.string().min(1),
    find: z.string().min(1),
    replace: z.string(),
    count: z.number().int().min(1).optional(),
  }).safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  try {
    const abs = resolveWithinRepo(body.data.path);
    const original = fs.readFileSync(abs, "utf8");
    const max = body.data.count ?? 1;

    let next = original;
    let replaced = 0;

    for (let i = 0; i < max; i++) {
      const idx = next.indexOf(body.data.find);
      if (idx === -1) break;
      next = next.slice(0, idx) + body.data.replace + next.slice(idx + body.data.find.length);
      replaced++;
    }

    if (replaced === 0) {
      return res.status(400).json({ error: "find string not found", replaced: 0 });
    }

    fs.writeFileSync(abs, next, "utf8");
    return res.json({ ok: true, replaced });
  } catch (e: any) {
    return res.status(400).json({ error: String(e?.message ?? e) });
  }
});

app.post("/tools/plan_and_patch", (req, res) => {
  const body = z.object({
    goal: z.string().min(1),
    paths: z.array(z.string().min(1)).min(1).max(12),
    maxCharsPerFile: z.number().int().min(500).max(200000).optional(),
  }).safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  try {
    const maxChars = body.data.maxCharsPerFile ?? 60000;

    const files = body.data.paths.map((rel) => {
      const abs = resolveWithinRepo(rel);
      const text = fs.readFileSync(abs, "utf8");
      const clipped = text.length > maxChars ? text.slice(0, maxChars) + "\n\n/* ...clipped... */\n" : text;
      return { path: rel, chars: text.length, text: clipped };
    });

    const prompt =
`You are acting as a senior engineer. I will provide file contents from my repo. 
Goal: ${body.data.goal}

Return:
1) A short plan
2) A single unified diff patch (or a sequence of replace_in_file calls if patch is risky)
3) A quick verification command

Files:
${files.map((f) => `\n--- FILE: ${f.path} (chars: ${f.chars}) ---\n${f.text}\n`).join("")}
`;

    return res.json({ ok: true, goal: body.data.goal, files, prompt });
  } catch (e) {
    return res.status(400).json({ error: String((e as any)?.message ?? e) });
  }
});
const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`[local-runner] listening on http://localhost:${port}`);
  console.log(`[local-runner] repo root: ${REPO_ROOT}`);
});
