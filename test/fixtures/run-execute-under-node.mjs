// Runs execute() itself under Node and reports its result. Bugs that
// depend on where Node splits the sandbox pipe never appear under a Bun
// host, so a bun-test process cannot observe them by calling execute()
// directly.
import { execute } from "../../src/tools/execute.js";

const result = await execute(process.argv[2]);
process.stdout.write(JSON.stringify(result));
