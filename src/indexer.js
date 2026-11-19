import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { enrichMethod } from "./method-entry.js";

const DOCS_DIR = join(import.meta.dirname ?? import.meta.dir, "../docs");

function collectKnownParams(text, paramNames) {
  const found = [];
  const re = /\b[a-z_][a-z0-9_]*\b/gi;
  let m = re.exec(text);
  while (m !== null) {
    const name = m[0];
    if (paramNames.has(name) && !found.includes(name)) found.push(name);
    m = re.exec(text);
  }
  return found;
}

// Detects only "one of" patterns triggered by generic English phrases.
// A constraint is emitted only when both branches of the "or" contain at
// least one parameter name from `params` — guards against false positives
// from generic prose like "must either contain SANs or a superset".
function extractConstraints(description, params) {
  if (typeof description !== "string" || !description) return [];
  if (!Array.isArray(params) || params.length === 0) return [];

  const paramNames = new Set(params.map((p) => p.name));
  if (paramNames.size === 0) return [];

  const constraints = [];
  const triggerRe =
    /\b(?:use either|must use either|must specify either|specify either|requires one of|requires either|provide either)\b/gi;

  const sentences = description.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    triggerRe.lastIndex = 0;
    const triggerMatch = triggerRe.exec(sentence);
    if (!triggerMatch) continue;

    const afterTrigger = sentence.slice(
      triggerMatch.index + triggerMatch[0].length,
    );
    const orMatch = / or /i.exec(afterTrigger);
    if (!orMatch) continue;

    const before = afterTrigger.slice(0, orMatch.index);
    const after = afterTrigger.slice(orMatch.index + orMatch[0].length);

    const groupA = collectKnownParams(before, paramNames);
    const groupB = collectKnownParams(after, paramNames);

    if (groupA.length === 0 || groupB.length === 0) continue;

    constraints.push({
      kind: "oneOf",
      groups: [groupA, groupB],
      sourceText: sentence.trim(),
    });
  }

  return constraints;
}

function cleanDocText(text) {
  return text
    .trim()
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x3d;/gi, "=")
    .replace(/\\/g, "")
    .trim();
}

function parseValueList(text) {
  try {
    const values = JSON.parse(`[${text}]`);
    return values.length > 0 ? values : undefined;
  } catch {
    return undefined;
  }
}

// `model` is just the type's last name, like `Backend` in `[Backend]`.
// It only counts as a model if a doc with that name exists.
function parseTableRow(line) {
  const pm = line.match(/^\*\*(\w+)\*\*\s*\|\s*(.*?)\s*\|\s*([^|]*)\|(.*)$/);
  if (!pm) return undefined;
  const type = (pm[2].match(/\*\*([^*]+)\*\*/)?.[1] || "").trim();
  const notes = pm[4].trim();
  // Look for flags before the value list, so a value like "[optional]" isn't taken for one.
  const oneOf = /\[one of: (.*)\]$/.exec(notes);
  const flags = oneOf ? notes.slice(0, oneOf.index) : notes;
  return {
    name: pm[1],
    type,
    model: type.match(/(\w+)\W*$/)?.[1],
    required: !flags.includes("[optional]"),
    readOnly: flags.includes("[readonly]"),
    description: cleanDocText(pm[3]),
    allowedValues: oneOf ? parseValueList(oneOf[1]) : undefined,
  };
}

function parseModelDoc(content) {
  if (/^## Enum$/m.test(content)) {
    const values = [
      ...content.matchAll(/^\* `[^`]+` \(value: `(.*)`\)$/gm),
    ].map((m) => m[1]);
    return { allowedValues: parseValueList(values.join(",")) };
  }
  return {
    properties: content
      .split("\n")
      .map(parseTableRow)
      .filter((row) => row !== undefined),
  };
}

// Only reads the model docs that parameters actually use.
async function loadModels(docsDir, docFiles, rows) {
  const models = new Map();
  let pending = rows.map((row) => row.model);
  while (pending.length > 0) {
    const names = [...new Set(pending)].filter(
      (name) => docFiles.has(`${name}.md`) && !models.has(name),
    );
    const docs = await Promise.all(
      names.map((name) => readFile(join(docsDir, `${name}.md`), "utf-8")),
    );
    pending = [];
    for (const [i, name] of names.entries()) {
      const model = parseModelDoc(docs[i]);
      models.set(name, model);
      for (const property of model.properties ?? []) {
        pending.push(property.model);
      }
    }
  }
  return models;
}

// Read-only fields are left out since the server fills them in.
// Expansion stops when a model refers back to itself.
function describeField(row, models, expanding = []) {
  const field = {
    name: row.name,
    type: row.type,
    required: row.required,
    description: row.description,
  };
  const model = models.get(row.model);
  const allowedValues = row.allowedValues ?? model?.allowedValues;
  if (allowedValues) field.allowedValues = allowedValues;
  if (model?.properties && !expanding.includes(row.model)) {
    const fields = model.properties
      .filter((property) => !property.readOnly)
      .map((property) =>
        describeField(property, models, [...expanding, row.model]),
      );
    if (fields.length > 0) field.fields = fields;
  }
  return field;
}

function parseApiDoc(content, apiClass) {
  const methods = [];

  const summaryMap = new Map();
  const tableRegex =
    /\[?\*\*(\w+)\*\*\]?\([^)]*\)\s*\|\s*\*\*(\w+)\*\*\s+([^\s|]+)\s*\|\s*(.+)/g;
  let m = tableRegex.exec(content);
  while (m !== null) {
    summaryMap.set(m[1], {
      httpMethod: m[2],
      httpPath: m[3].trim(),
      shortDesc: m[4].trim(),
    });
    m = tableRegex.exec(content);
  }

  const sectionRegex = /^## `(\w+)`$/gm;
  const sectionStarts = [];
  m = sectionRegex.exec(content);
  while (m !== null) {
    sectionStarts.push({ name: m[1], index: m.index });
    m = sectionRegex.exec(content);
  }

  for (let i = 0; i < sectionStarts.length; i++) {
    const { name, index: startIdx } = sectionStarts[i];
    const endIdx =
      i + 1 < sectionStarts.length
        ? sectionStarts[i + 1].index
        : content.length;
    const section = content.slice(startIdx, endIdx);

    const summary = summaryMap.get(name);
    if (!summary) continue;

    let description = summary.shortDesc;
    const signatureBlockMatch = section.match(/```[a-zA-Z]*\n[\s\S]*?\n```\n/);
    if (signatureBlockMatch) {
      const afterCode = section.slice(
        signatureBlockMatch.index + signatureBlockMatch[0].length,
      );
      const exampleIdx = afterCode.indexOf("### Example");
      if (exampleIdx !== -1) {
        const rawDesc = cleanDocText(afterCode.slice(0, exampleIdx));
        if (rawDesc) description = rawDesc;
      }
    }

    const params = [];
    const optionsIdx = section.indexOf("### Options");
    const returnIdx = section.indexOf("### Return type");
    if (optionsIdx !== -1) {
      const optionsEnd = returnIdx !== -1 ? returnIdx : section.length;
      const optionsBlock = section.slice(optionsIdx, optionsEnd);
      for (const line of optionsBlock.split("\n")) {
        const row = parseTableRow(line);
        if (row) params.push(row);
      }
    }

    let returnType = "void";
    if (returnIdx !== -1) {
      const returnBlock = section.slice(returnIdx + 15).trim();
      const firstLine = returnBlock.split("\n")[0].trim();
      const typeMatch = firstLine.match(/\[?\*\*([^*]+)\*\*\]?(?:\([^)]*\))?/);
      if (typeMatch) {
        returnType = typeMatch[1].trim();
      } else if (firstLine === "null (empty response body)") {
        returnType = "null";
      }
    }

    const constraints = extractConstraints(description, params);

    methods.push({
      apiClass,
      method: name,
      httpMethod: summary.httpMethod,
      httpPath: summary.httpPath,
      description,
      params,
      constraints,
      returnType,
    });
  }

  return methods;
}

export async function buildIndex(docsDir = DOCS_DIR) {
  const files = await readdir(docsDir);
  const apiFiles = files.filter(
    (f) => f.endsWith("Api.md") && !f.startsWith("."),
  );

  if (apiFiles.length === 0) {
    throw new Error(`No *Api.md files found in ${docsDir}`);
  }

  const index = [];
  let filesWithMethods = 0;
  const warnings = [];

  const docs = await Promise.all(
    apiFiles.map(async (file) => ({
      file,
      apiClass: basename(file, ".md"),
      content: await readFile(join(docsDir, file), "utf-8"),
    })),
  );

  for (const { file, apiClass, content } of docs) {
    const methods = parseApiDoc(content, apiClass);

    if (methods.length > 0) {
      filesWithMethods++;
    } else {
      warnings.push(`${file} yielded no methods`);
    }

    for (const method of methods) {
      if (!method.httpMethod || !method.httpPath) {
        throw new Error(
          `${apiClass}.${method.method} missing httpMethod or httpPath`,
        );
      }
      if (!method.description) {
        warnings.push(`${apiClass}.${method.method} has empty description`);
      }
    }

    index.push(...methods);
  }

  const models = await loadModels(
    docsDir,
    new Set(files.filter((f) => !f.endsWith("Api.md"))),
    index.flatMap((method) => method.params),
  );
  for (const method of index) {
    method.params = method.params.map((row) => describeField(row, models));
    enrichMethod(method);
  }

  if (index.length === 0) {
    throw new Error("Index is empty — no methods were parsed from any file");
  }

  const ratio = filesWithMethods / apiFiles.length;
  if (ratio < 0.5) {
    throw new Error(
      `Only ${filesWithMethods}/${apiFiles.length} Api.md files yielded methods (< 50%)`,
    );
  }

  if (warnings.length > 0) {
    console.error(`[indexer] ${warnings.length} warnings:`);
    for (const w of warnings) {
      console.error(`  - ${w}`);
    }
  }

  console.error(
    `[indexer] Built index: ${index.length} methods across ${filesWithMethods} API classes from ${apiFiles.length} files`,
  );

  return index;
}
