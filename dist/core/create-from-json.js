"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFromJSON = exports.SUPPORTED_SCHEMA_RANGE = void 0;
const semver = require("semver");
const graphlib = require("../graphlib");
const errors_1 = require("./errors");
const validate_graph_1 = require("./validate-graph");
const dep_graph_1 = require("./dep-graph");
exports.SUPPORTED_SCHEMA_RANGE = '^1.0.0';
/**
 * Create a DepGraph instance from a JSON representation of a dep graph. This
 * is typically used after passing the graph over the wire as `DepGraphData`.
 */
function createFromJSON(depGraphData) {
    validateDepGraphData(depGraphData);
    const graph = new graphlib.Graph({
        directed: true,
        multigraph: false,
        compound: false,
    });
    const pkgs = {};
    const pkgNodes = {};
    for (const { id, info } of depGraphData.pkgs) {
        pkgs[id] = info.version ? info : { ...info, version: undefined };
    }
    for (const node of depGraphData.graph.nodes) {
        const pkgId = node.pkgId;
        if (!pkgNodes[pkgId]) {
            pkgNodes[pkgId] = new Set();
        }
        pkgNodes[pkgId].add(node.nodeId);
        graph.setNode(node.nodeId, { pkgId, info: node.info });
    }
    for (const node of depGraphData.graph.nodes) {
        for (const depNodeId of node.deps) {
            graph.setEdge(node.nodeId, depNodeId.nodeId);
        }
    }
    (0, validate_graph_1.validateGraph)(graph, depGraphData.graph.rootNodeId, pkgs, pkgNodes);
    return new dep_graph_1.DepGraphImpl(graph, depGraphData.graph.rootNodeId, pkgs, pkgNodes, depGraphData.pkgManager);
}
exports.createFromJSON = createFromJSON;
function assert(condition, msg) {
    if (!condition) {
        throw new errors_1.ValidationError(msg);
    }
}
function validateDepGraphData(depGraphData) {
    assert(!!semver.valid(depGraphData.schemaVersion) &&
        semver.satisfies(depGraphData.schemaVersion, exports.SUPPORTED_SCHEMA_RANGE), `dep-graph schemaVersion not in "${exports.SUPPORTED_SCHEMA_RANGE}"`);
    assert(depGraphData.pkgManager && !!depGraphData.pkgManager.name, '.pkgManager.name is missing');
    const pkgsMap = depGraphData.pkgs.reduce((acc, cur) => {
        assert(!(cur.id in acc), 'more than one pkg with same id');
        assert(!!cur.info, '.pkgs item missing .info');
        acc[cur.id] = cur.info;
        return acc;
    }, {});
    const nodesMap = depGraphData.graph.nodes.reduce((acc, cur) => {
        assert(!(cur.nodeId in acc), 'more than on node with same id');
        acc[cur.nodeId] = cur;
        return acc;
    }, {});
    const rootNodeId = depGraphData.graph.rootNodeId;
    const rootNode = nodesMap[rootNodeId];
    assert(rootNodeId in nodesMap, `.${rootNodeId} root graph node is missing`);
    const rootPkgId = rootNode.pkgId;
    assert(rootPkgId in pkgsMap, `.${rootPkgId} root pkg missing`);
    assert(nodesMap[rootNodeId].pkgId === rootPkgId, `the root node .pkgId should be "${rootPkgId}"`);
    const pkgIds = Object.keys(pkgsMap);
    // NOTE: this name@version check is very strict,
    // we can relax it later, it just makes things easier now
    assert(pkgIds.filter((pkgId) => pkgId !== dep_graph_1.DepGraphImpl.getPkgId(pkgsMap[pkgId]))
        .length === 0, 'pkgs ids should be name@version');
    assert(Object.values(nodesMap).filter((node) => !(node.pkgId in pkgsMap))
        .length === 0, 'some instance nodes belong to non-existing pkgIds');
    assert(Object.values(pkgsMap).filter((pkg) => !pkg.name)
        .length === 0, 'some .pkgs elements have no .name field');
}
//# sourceMappingURL=create-from-json.js.map