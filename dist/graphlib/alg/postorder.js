"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postorder = void 0;
const dfs_1 = require("./dfs");
function postorder(g, vs) {
    return (0, dfs_1.dfs)(g, vs, 'post');
}
exports.postorder = postorder;
//# sourceMappingURL=postorder.js.map