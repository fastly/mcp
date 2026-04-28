export function inspect(index, method) {
  if (typeof method !== "string" || !method.trim()) {
    return { ok: false, error: "method must be a non-empty string" };
  }

  const query = method.trim();
  const queryLower = query.toLowerCase();

  let match = index.find((m) => m.method.toLowerCase() === queryLower);

  if (!match && query.includes(".")) {
    const [cls, meth] = query.split(".", 2);
    const clsLower = cls.toLowerCase();
    const methLower = meth.toLowerCase();
    match = index.find(
      (m) =>
        m.apiClass.toLowerCase() === clsLower &&
        m.method.toLowerCase() === methLower,
    );
  }

  if (!match) {
    const partial = index
      .filter((m) => m.method.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .map((m) => `${m.apiClass}.${m.method}`);

    return {
      ok: false,
      error: `No method named '${query}' found.${partial.length > 0 ? ` Did you mean: ${partial.join(", ")}?` : " Use the search tool to find available methods."}`,
    };
  }

  const doc = {
    ok: true,
    apiClass: match.apiClass,
    method: match.method,
    httpMethod: match.httpMethod,
    httpPath: match.httpPath,
    description: match.description,
    returnType: match.returnType,
    params: match.params,
  };

  if (match.example) {
    doc.example = match.example;
  }

  doc.usage = `const api = new Fastly.${match.apiClass}();\nreturn await api.${match.method}(${match.params.length > 0 ? "{ /* params */ }" : ""});`;

  return doc;
}
