"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepGraphBuilder = void 0;
const graphlib = require("../graphlib");
const dep_graph_1 = require("./dep-graph");
const validate_graph_1 = require("./validate-graph");
class DepGraphBuilder {
    constructor(pkgManager, rootPkg) {
        this._pkgs = {};
        this._pkgNodes = {};
        const graph = new graphlib.Graph({
            directed: true,
            multigraph: false,
            compound: false,
        });
        if (!rootPkg) {
            rootPkg = {
                name: '_root',
                version: '0.0.0',
            };
        }
        this._rootNodeId = 'root-node';
        this._rootPkgId = DepGraphBuilder._getPkgId(rootPkg);
        this._pkgs[this._rootPkgId] = rootPkg;
        graph.setNode(this._rootNodeId, { pkgId: this._rootPkgId });
        this._pkgNodes[this._rootPkgId] = new Set([this._rootNodeId]);
        this._graph = graph;
        this._pkgManager = pkgManager;
    }
    get rootNodeId() {
        return this._rootNodeId;
    }
    static _getPkgId(pkg) {
        return `${pkg.name}@${pkg.version || ''}`;
    }
    getPkgs() {
        return Object.values(this._pkgs);
    }
    // TODO: this can create disconnected nodes
    addPkgNode(pkgInfo, nodeId, nodeInfo) {
        if (nodeId === this._rootNodeId) {
            throw new Error('DepGraphBuilder.addPkgNode() cant override root node');
        }
        (0, validate_graph_1.validatePackageURL)(pkgInfo);
        const pkgId = DepGraphBuilder._getPkgId(pkgInfo);
        this._pkgs[pkgId] = pkgInfo;
        this._pkgNodes[pkgId] = this._pkgNodes[pkgId] || new Set();
        this._pkgNodes[pkgId].add(nodeId);
        this._graph.setNode(nodeId, { pkgId, info: nodeInfo });
        return this;
    }
    // TODO: this can create cycles
    connectDep(parentNodeId, depNodeId) {
        if (!this._graph.hasNode(parentNodeId)) {
            throw new Error('parentNodeId does not exist');
        }
        if (!this._graph.hasNode(depNodeId)) {
            throw new Error('depNodeId does not exist');
        }
        this._graph.setEdge(parentNodeId, depNodeId);
        return this;
    }
    build() {
        return new dep_graph_1.DepGraphImpl(this._graph, this._rootNodeId, this._pkgs, this._pkgNodes, this._pkgManager);
    }
}
exports.DepGraphBuilder = DepGraphBuilder;
//# sourceMappingURL=builder.js.map