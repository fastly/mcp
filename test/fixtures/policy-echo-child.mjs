// Stands in for the sandbox and answers with the policy the parent sent, so a test can check what reaches the child.
import { json } from "node:stream/consumers";

const { policy } = await json(process.stdin);
process.stdout.write(JSON.stringify({ ok: true, result: policy }), () =>
  process.exit(0),
);
