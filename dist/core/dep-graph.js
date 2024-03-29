"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepGraphImpl = void 0;
const _isEqual = require("lodash.isequal");
const graphlib = require("../graphlib");
const create_from_json_1 = require("./create-from-json");
class DepGraphImpl {
    constructor(_graph, _rootNodeId, _pkgs, _pkgNodes, _pkgManager) {
        this._graph = _graph;
        this._rootNodeId = _rootNodeId;
        this._pkgs = _pkgs;
        this._pkgNodes = _pkgNodes;
        this._pkgManager = _pkgManager;
        this._countNodePathsToRootCache = new Map();
        this._rootPkgId = _graph.node(_rootNodeId).pkgId;
        this._pkgList = Object.values(_pkgs);
        this._depPkgsList = this._pkgList.filter((pkg) => pkg !== this.rootPkg);
    }
    static getPkgId(pkg) {
        return `${pkg.name}@${pkg.version || ''}`;
    }
    get pkgManager() {
        return this._pkgManager;
    }
    get rootPkg() {
        return this._pkgs[this._rootPkgId];
    }
    get rootNodeId() {
        return this._rootNodeId;
    }
    /**
     * Get all unique packages in the graph (including the root package)
     */
    getPkgs() {
        return this._pkgList;
    }
    /**
     * Get all unique packages in the graph (excluding the root package)
     */
    getDepPkgs() {
        return this._depPkgsList;
    }
    getPkgNodes(pkg) {
        const pkgId = DepGraphImpl.getPkgId(pkg);
        const nodes = [];
        for (const nodeId of Array.from(this._pkgNodes[pkgId])) {
            const graphNode = this.getGraphNode(nodeId);
            nodes.push({
                info: graphNode.info || {},
            });
        }
        return nodes;
    }
    getNode(nodeId) {
        return this.getGraphNode(nodeId).info || {};
    }
    getNodePkg(nodeId) {
        return this._pkgs[this.getGraphNode(nodeId).pkgId];
    }
    getPkgNodeIds(pkg) {
        const pkgId = DepGraphImpl.getPkgId(pkg);
        if (!this._pkgs[pkgId]) {
            throw new Error(`no such pkg: ${pkgId}`);
        }
        return Array.from(this._pkgNodes[pkgId]);
    }
    getNodeDepsNodeIds(nodeId) {
        const deps = this._graph.successors(nodeId);
        if (!deps) {
            throw new Error(`no such node: ${nodeId}`);
        }
        return deps;
    }
    getNodeParentsNodeIds(nodeId) {
        const parents = this._graph.predecessors(nodeId);
        if (!parents) {
            throw new Error(`no such node: ${nodeId}`);
        }
        return parents;
    }
    hasCycles() {
        // `isAcyclic` is expensive, so memoize
        if (this._hasCycles === undefined) {
            this._hasCycles = !graphlib.alg.isAcyclic(this._graph);
        }
        return this._hasCycles;
    }
    pkgPathsToRoot(pkg, opts) {
        const pathsToRoot = [];
        const limit = opts === null || opts === void 0 ? void 0 : opts.limit;
        for (const nodeId of this.getPkgNodeIds(pkg)) {
            const pathsFromNodeToRoot = this.pathsFromNodeToRoot(nodeId, [], {
                limit,
            });
            for (const path of pathsFromNodeToRoot) {
                pathsToRoot.push(path);
            }
            if (limit && pathsToRoot.length >= limit) {
                break;
            }
        }
        // note: sorting to get shorter paths first -
        //  it's nicer - and better resembles older behaviour
        return pathsToRoot.sort((a, b) => a.length - b.length);
    }
    countPathsToRoot(pkg) {
        let count = 0;
        for (const nodeId of this.getPkgNodeIds(pkg)) {
            if (this._countNodePathsToRootCache.has(nodeId)) {
                count += this._countNodePathsToRootCache.get(nodeId);
            }
            else {
                const c = this.countNodePathsToRoot(nodeId);
                this._countNodePathsToRootCache.set(nodeId, c);
                count += c;
            }
        }
        return count;
    }
    isTransitive(pkg) {
        const checking = new Set(this.getPkgNodeIds(pkg));
        for (const directDep of this.getNodeDepsNodeIds(this.rootNodeId)) {
            if (checking.has(directDep))
                return false;
        }
        return true;
    }
    equals(other, { compareRoot = true } = {}) {
        let otherDepGraph;
        if (other instanceof DepGraphImpl) {
            otherDepGraph = other;
        }
        else {
            // At runtime theoretically we can have multiple versions of
            // @w3security/dep-graph. If "other" is not an instance of the same class it is
            // safer to rebuild it from JSON.
            otherDepGraph = (0, create_from_json_1.createFromJSON)(other.toJSON());
        }
        // In theory, for the graphs created by standard means, `_.isEquals(this._data, otherDepGraph._data)`
        // should suffice, since node IDs will be generated in a predictable way.
        // However, there might be different versions of graph and inconsistencies
        // in the ordering of the arrays, so we perform a deep comparison.
        return this.nodeEquals(this, this.rootNodeId, otherDepGraph, otherDepGraph.rootNodeId, compareRoot);
    }
    directDepsLeadingTo(pkg) {
        const pkgNodes = this.getPkgNodeIds(pkg);
        const directDeps = this.getNodeDepsNodeIds(this.rootNodeId);
        const nodes = directDeps.filter((directDep) => {
            const reachableNodes = graphlib.alg.postorder(this._graph, [directDep]);
            return reachableNodes.filter((node) => pkgNodes.includes(node)).length;
        });
        return nodes.map((node) => this.getNodePkg(node));
    }
    /**
     * Create a JSON representation of a dep graph. This is typically used to
     * send the dep graph over the wire
     */
    toJSON() {
        const nodeIds = this._graph.nodes();
        const nodes = nodeIds.reduce((acc, nodeId) => {
            const deps = (this._graph.successors(nodeId) || []).map((depNodeId) => ({
                nodeId: depNodeId,
            }));
            const node = this._graph.node(nodeId);
            const elem = {
                nodeId,
                pkgId: node.pkgId,
                deps,
            };
            if (node.info && Object.keys(node.info).length > 0) {
                elem.info = node.info;
            }
            acc.push(elem);
            return acc;
        }, []);
        const pkgs = Object.keys(this._pkgs).map((pkgId) => ({
            id: pkgId,
            info: this._pkgs[pkgId],
        }));
        return {
            schemaVersion: DepGraphImpl.SCHEMA_VERSION,
            pkgManager: this._pkgManager,
            pkgs,
            graph: {
                rootNodeId: this._rootNodeId,
                nodes,
            },
        };
    }
    nodeEquals(graphA, nodeIdA, graphB, nodeIdB, compareRoot, traversedPairs = new Set()) {
        // Skip root nodes comparison if needed.
        if (compareRoot ||
            (nodeIdA !== graphA.rootNodeId && nodeIdB !== graphB.rootNodeId)) {
            const pkgA = graphA.getNodePkg(nodeIdA);
            const pkgB = graphB.getNodePkg(nodeIdB);
            // Compare PkgInfo (name and version).
            if (!_isEqual(pkgA, pkgB)) {
                return false;
            }
            const infoA = graphA.getNode(nodeIdA);
            const infoB = graphB.getNode(nodeIdB);
            // Compare NodeInfo (VersionProvenance and labels).
            if (!_isEqual(infoA, infoB)) {
                return false;
            }
        }
        let depsA = graphA.getNodeDepsNodeIds(nodeIdA);
        let depsB = graphB.getNodeDepsNodeIds(nodeIdB);
        // Number of dependencies should be the same.
        if (depsA.length !== depsB.length) {
            return false;
        }
        // Sort dependencies by name@version string.
        const sortFn = (graph) => (idA, idB) => {
            const pkgA = graph.getNodePkg(idA);
            const pkgB = graph.getNodePkg(idB);
            return DepGraphImpl.getPkgId(pkgA).localeCompare(DepGraphImpl.getPkgId(pkgB));
        };
        depsA = depsA.sort(sortFn(graphA));
        depsB = depsB.sort(sortFn(graphB));
        // Compare Each dependency recursively.
        for (let i = 0; i < depsA.length; i++) {
            const pairKey = `${depsA[i]}_${depsB[i]}`;
            // Prevent cycles.
            if (traversedPairs.has(pairKey)) {
                continue;
            }
            traversedPairs.add(pairKey);
            if (!this.nodeEquals(graphA, depsA[i], graphB, depsB[i], compareRoot, traversedPairs)) {
                return false;
            }
        }
        return true;
    }
    getGraphNode(nodeId) {
        const node = this._graph.node(nodeId);
        if (!node) {
            throw new Error(`no such node: ${nodeId}`);
        }
        return node;
    }
    pathsFromNodeToRoot(nodeId, ancestors = [], opts) {
        const parentNodesIds = this.getNodeParentsNodeIds(nodeId);
        const pkgInfo = this.getNodePkg(nodeId);
        if (parentNodesIds.length === 0) {
            return [[pkgInfo]];
        }
        const allPaths = [];
        ancestors = ancestors.concat(nodeId);
        const limit = opts.limit;
        for (const id of parentNodesIds) {
            if (ancestors.includes(id))
                continue;
            const pathsFromNodeToRoot = this.pathsFromNodeToRoot(id, ancestors, opts);
            for (const path of pathsFromNodeToRoot) {
                allPaths.push([pkgInfo].concat(path));
            }
            if (limit && allPaths.length >= limit) {
                break;
            }
        }
        return allPaths;
    }
    countNodePathsToRoot(nodeId, visited = []) {
        if (nodeId === this._rootNodeId) {
            return 1;
        }
        visited = visited.concat(nodeId);
        let count = 0;
        for (const parentNodeId of this.getNodeParentsNodeIds(nodeId)) {
            if (!visited.includes(parentNodeId)) {
                count += this.countNodePathsToRoot(parentNodeId, visited);
            }
        }
        return count;
    }
}
exports.DepGraphImpl = DepGraphImpl;
DepGraphImpl.SCHEMA_VERSION = '1.3.0';
//# sourceMappingURL=dep-graph.js.map