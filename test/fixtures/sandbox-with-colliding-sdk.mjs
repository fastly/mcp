// Runs the mock-backed sandbox against an SDK that also exports one of the
// server's own NGWAF classes, as a later SDK release might.
import Fastly from "fastly";

Fastly.NgwafRulesApi = class NgwafRulesApi {};

await import("./sandbox-with-mock-fastly.mjs");
