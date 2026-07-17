import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

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
    .replace(/\\/g, "")
    .trim();
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
      const lines = optionsBlock.split("\n");
      for (const line of lines) {
        const pm = line.match(
          /^\*\*(\w+)\*\*\s*\|\s*(?:\[?\*\*([^*|[\]]+)\*\*\]?(?:\([^)]*\))?|)\s*\|\s*([^|]*)\|(.*)$/,
        );
        if (!pm) continue;
        const paramName = pm[1];
        const paramType = (pm[2] || "").trim();
        const paramDesc = cleanDocText(pm[3] || "");
        const notes = (pm[4] || "").trim();
        const required = !notes.includes("[optional]");
        params.push({
          name: paramName,
          type: paramType,
          required,
          description: paramDesc,
        });
      }
    }

    let example = "";
    const exampleIdx = section.indexOf("### Example");
    if (exampleIdx !== -1) {
      const afterExample = section.slice(exampleIdx);
      const codeStart = afterExample.indexOf("```javascript\n");
      if (codeStart !== -1) {
        const codeBody = afterExample.slice(codeStart + 14);
        const codeEnd = codeBody.indexOf("```");
        if (codeEnd !== -1) {
          example = codeBody.slice(0, codeEnd).trim();
        }
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
      example,
    });
  }

  return methods;
}

function extractPathParams(httpPath) {
  if (typeof httpPath !== "string") return [];
  const out = [];
  const re = /\{([^}]+)\}/g;
  let m = re.exec(httpPath);
  while (m !== null) {
    out.push(m[1]);
    m = re.exec(httpPath);
  }
  return out;
}

export function enrichMethod(method) {
  if (!Array.isArray(method.params)) method.params = [];
  if (method.methodLower !== undefined) return method;
  const apiClass = method.apiClass;
  method.shortcut = apiClass.charAt(0).toLowerCase() + apiClass.slice(1);
  method.methodLower = method.method.toLowerCase();
  method.classLower = apiClass.toLowerCase();
  method.pathLower = (method.httpPath ?? "").toLowerCase();
  method.descLower = (method.description ?? "").toLowerCase();
  method.returnLower = (method.returnType ?? "").toLowerCase();
  method.paramsLower = method.params.map((p) => p.name.toLowerCase());
  method.requiredParams = method.params
    .filter((p) => p.required === true)
    .map((p) => p.name);
  method.pathParams = extractPathParams(method.httpPath);
  return method;
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

    for (const method of methods) enrichMethod(method);
    index.push(...methods);
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

  if (apiFiles.length !== 138) {
    warnings.push(`Expected 138 Api.md files, found ${apiFiles.length}`);
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
