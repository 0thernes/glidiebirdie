import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const textFiles = {
  html: await readFile("index.html", "utf8"),
  css: await readFile("style.css", "utf8"),
  js: await readFile("game.js", "utf8"),
  readme: await readFile("README.md", "utf8"),
  gitignore: await readFile(".gitignore", "utf8"),
  gitattributes: await readFile(".gitattributes", "utf8"),
};

const syntax = spawnSync(process.execPath, ["--check", "game.js"], {
  encoding: "utf8",
});
assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout);

assert.match(
  textFiles.html,
  /<canvas[\s\S]*id="game"/,
  "index.html must expose the game canvas.",
);
assert.match(
  textFiles.html,
  /id="srStatus"/,
  "index.html must keep the live status region.",
);
assert.match(
  textFiles.html,
  /id="customizerDrawer"/,
  "index.html must keep the customizer drawer.",
);
assert.match(
  textFiles.html,
  /aria-modal="true"/,
  "customizer drawer must advertise modal semantics.",
);
assert.match(
  textFiles.html,
  /\binert\b/,
  "closed customizer drawer must start inert.",
);
assert.match(
  textFiles.css,
  /\.customizer-drawer/,
  "style.css must style the customizer drawer.",
);
assert.match(
  textFiles.js,
  /function loop\(/,
  "game.js must define the animation loop.",
);
assert.match(
  textFiles.js,
  /function updateDerivedPhysics\(/,
  "game.js must derive physics from customizer settings.",
);
assert.match(
  textFiles.js,
  /function bindDrawerControls\(/,
  "game.js must bind the customizer controls.",
);
assert.match(
  textFiles.js,
  /function setCustomizerOpen\(/,
  "game.js must centralize customizer open/close state.",
);
assert.match(
  textFiles.js,
  /best:\s+readStoredNumber\(['"]flappy-best['"]/,
  "best score must be read through the guarded storage helper.",
);
assert.match(
  textFiles.js,
  /zenTimeSec:\s+readStoredNumber\(['"]zen-time-sec['"]/,
  "stats must be read through the guarded storage helper.",
);
assert.match(
  textFiles.gitattributes,
  /eol=lf/,
  ".gitattributes must agree with .editorconfig line endings.",
);

const forbiddenSecretMarkers = [
  new RegExp(["Recovery", "Codes"].join(" "), "i"),
  new RegExp(["Backup", "Codes"].join(" "), "i"),
  new RegExp(["Bit", "Locker"].join(""), "i"),
  new RegExp(["Client", "Secret"].join(" "), "i"),
  new RegExp(["Signing", "Secret"].join(" "), "i"),
  new RegExp(["OAuth", "Token"].join(" "), "i"),
  new RegExp(["API", "Key"].join(" "), "i"),
  new RegExp(["xo", "x", "[", "b", "a", "p", "r", "s", "]-"].join(""), "i"),
  new RegExp(["xa", "pp-"].join(""), "i"),
];

for (const marker of forbiddenSecretMarkers) {
  assert.doesNotMatch(
    textFiles.gitignore,
    marker,
    `.gitignore still contains sensitive marker ${marker}.`,
  );
}

assert.match(
  textFiles.readme,
  /Customizer/i,
  "README should document the customizer.",
);
assert.match(
  textFiles.readme,
  /Feather Shield/i,
  "README should document shield behavior.",
);

console.log("Smoke checks passed.");
