"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAcyclic = void 0;
const topsort_1 = require("./topsort");
function isAcyclic(g) {
    try {
        (0, topsort_1.topsort)(g);
    }
    catch (e) {
        if (e instanceof topsort_1.CycleException) {
            return false;
        }
        throw e;
    }
    return true;
}
exports.isAcyclic = isAcyclic;
//# sourceMappingURL=is-acyclic.js.map