"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphToDepTree = exports.depTreeToGraph = void 0;
const crypto = require("crypto");
const event_loop_spinner_1 = require("event-loop-spinner");
const builder_1 = require("../core/builder");
const objectHash = require("object-hash");
const cycles_1 = require("./cycles");
const memiozation_1 = require("./memiozation");
function addLabel(dep, key, value) {
    if (!dep.labels) {
        dep.labels = {};
    }
    dep.labels[key] = value;
}
/**
 * @deprecated Don't use dep trees as an intermediate step, because they are
 * large structures, resulting in high memory usage and high CPU costs from
 * serializing / deserializing. Instead, create a graph directly with
 * {@link DepGraphBuilder}
 */
async function depTreeToGraph(depTree, pkgManagerName) {
    const rootPkg = {
        name: depTree.name,
        version: depTree.version || undefined,
    };
    if (depTree.purl) {
        rootPkg.purl = depTree.purl;
    }
    const pkgManagerInfo = {
        name: pkgManagerName,
    };
    const targetOS = depTree.targetOS;
    if (targetOS) {
        pkgManagerInfo.repositories = [
            {
                alias: `${targetOS.name}:${targetOS.version}`,
            },
        ];
    }
    const builder = new builder_1.DepGraphBuilder(pkgManagerInfo, rootPkg);
    await buildGraph(builder, depTree, depTree.name, true);
    const depGraph = await builder.build();
    return shortenNodeIds(depGraph);
}
exports.depTreeToGraph = depTreeToGraph;
async function buildGraph(builder, depTree, pkgName, isRoot = false, memoizationMap = new Map()) {
    if (memoizationMap.has(depTree)) {
        return memoizationMap.get(depTree);
    }
    const getNodeId = (name, version, hashId) => `${name}@${version || ''}|${hashId}`;
    const depNodesIds = [];
    const hash = crypto.createHash('sha1');
    if (depTree.versionProvenance) {
        hash.update(objectHash(depTree.versionProvenance));
    }
    if (depTree.labels) {
        hash.update(objectHash(depTree.labels));
    }
    const deps = depTree.dependencies || {};
    // filter-out invalid null deps (shouldn't happen - but did...)
    const depNames = Object.keys(deps).filter((d) => !!deps[d]);
    for (const depName of depNames.sort()) {
        const dep = deps[depName];
        const subtreeHash = await buildGraph(builder, dep, depName, false, memoizationMap);
        const depPkg = {
            name: depName,
            version: dep.version,
        };
        if (dep.purl) {
            depPkg.purl = dep.purl;
        }
        const depNodeId = getNodeId(depPkg.name, depPkg.version, subtreeHash);
        depNodesIds.push(depNodeId);
        const nodeInfo = {};
        if (dep.versionProvenance) {
            nodeInfo.versionProvenance = dep.versionProvenance;
        }
        if (dep.labels) {
            nodeInfo.labels = dep.labels;
        }
        builder.addPkgNode(depPkg, depNodeId, nodeInfo);
        hash.update(depNodeId);
    }
    const treeHash = hash.digest('hex');
    let pkgNodeId;
    if (isRoot) {
        pkgNodeId = builder.rootNodeId;
    }
    else {
        // we don't assume depTree has a .name to support output of `npm list --json`
        const pkg = {
            name: pkgName,
            version: depTree.version,
        };
        pkgNodeId = getNodeId(pkg.name, pkg.version, treeHash);
        const nodeInfo = {};
        if (depTree.versionProvenance) {
            nodeInfo.versionProvenance = depTree.versionProvenance;
        }
        if (depTree.labels) {
            nodeInfo.labels = depTree.labels;
        }
        builder.addPkgNode(pkg, pkgNodeId, nodeInfo);
    }
    for (const depNodeId of depNodesIds) {
        builder.connectDep(pkgNodeId, depNodeId);
    }
    if (depNodesIds.length > 0 && event_loop_spinner_1.eventLoopSpinner.isStarving()) {
        await event_loop_spinner_1.eventLoopSpinner.spin();
    }
    memoizationMap.set(depTree, treeHash);
    return treeHash;
}
async function shortenNodeIds(depGraph) {
    const builder = new builder_1.DepGraphBuilder(depGraph.pkgManager, depGraph.rootPkg);
    const nodesMap = {};
    // create nodes with shorter ids
    for (const pkg of depGraph.getPkgs()) {
        const nodeIds = depGraph.getPkgNodeIds(pkg);
        for (let i = 0; i < nodeIds.length; i++) {
            const nodeId = nodeIds[i];
            if (nodeId === depGraph.rootNodeId) {
                continue;
            }
            const nodeInfo = depGraph.getNode(nodeId);
            let newNodeId;
            if (nodeIds.length === 1) {
                newNodeId = `${trimAfterLastSep(nodeId, '|')}`;
            }
            else {
                newNodeId = `${trimAfterLastSep(nodeId, '|')}|${i + 1}`;
            }
            nodesMap[nodeId] = newNodeId;
            builder.addPkgNode(pkg, newNodeId, nodeInfo);
        }
        if (event_loop_spinner_1.eventLoopSpinner.isStarving()) {
            await event_loop_spinner_1.eventLoopSpinner.spin();
        }
    }
    // connect nodes
    for (const pkg of depGraph.getPkgs()) {
        for (const nodeId of depGraph.getPkgNodeIds(pkg)) {
            for (const depNodeId of depGraph.getNodeDepsNodeIds(nodeId)) {
                const parentNode = nodesMap[nodeId] || nodeId;
                const childNode = nodesMap[depNodeId] || depNodeId;
                builder.connectDep(parentNode, childNode);
            }
        }
        if (event_loop_spinner_1.eventLoopSpinner.isStarving()) {
            await event_loop_spinner_1.eventLoopSpinner.spin();
        }
    }
    return builder.build();
}
/**
 * @deprecated Don't use dep trees. You should adapt your code to use graphs,
 * and enhance the dep-graph library if there is missing functionality from
 * the graph structure
 */
async function graphToDepTree(depGraphInterface, pkgType, opts = { deduplicateWithinTopLevelDeps: false }) {
    const depGraph = depGraphInterface;
    const [depTree] = await buildSubtree(depGraph, depGraph.rootNodeId, opts.deduplicateWithinTopLevelDeps ? null : false);
    depTree.type = depGraph.pkgManager.name;
    depTree.packageFormatVersion = constructPackageFormatVersion(pkgType);
    const targetOS = constructTargetOS(depGraph);
    if (targetOS) {
        depTree.targetOS = targetOS;
    }
    return depTree;
}
exports.graphToDepTree = graphToDepTree;
function constructPackageFormatVersion(pkgType) {
    if (pkgType === 'maven') {
        pkgType = 'mvn';
    }
    return `${pkgType}:0.0.1`;
}
function constructTargetOS(depGraph) {
    if (['apk', 'apt', 'deb', 'rpm', 'linux'].indexOf(depGraph.pkgManager.name) ===
        -1) {
        // .targetOS is undefined unless its a linux pkgManager
        return;
    }
    if (!depGraph.pkgManager.repositories ||
        !depGraph.pkgManager.repositories.length ||
        !depGraph.pkgManager.repositories[0].alias) {
        throw new Error('Incomplete .pkgManager, could not create .targetOS');
    }
    const [name, version] = depGraph.pkgManager.repositories[0].alias.split(':');
    return { name, version };
}
async function buildSubtree(depGraph, nodeId, maybeDeduplicationSet = false, // false = disabled; null = not in deduplication scope yet
ancestors = [], memoizationMap = new Map()) {
    if (!maybeDeduplicationSet) {
        const memoizedDepTree = (0, memiozation_1.getMemoizedDepTree)(nodeId, ancestors, memoizationMap);
        if (memoizedDepTree) {
            return [memoizedDepTree, undefined];
        }
    }
    const isRoot = nodeId === depGraph.rootNodeId;
    const nodePkg = depGraph.getNodePkg(nodeId);
    const nodeInfo = depGraph.getNode(nodeId);
    const depTree = {};
    depTree.name = nodePkg.name;
    depTree.version = nodePkg.version;
    if (nodeInfo.versionProvenance) {
        depTree.versionProvenance = nodeInfo.versionProvenance;
    }
    if (nodeInfo.labels) {
        depTree.labels = { ...nodeInfo.labels };
    }
    const depInstanceIds = depGraph.getNodeDepsNodeIds(nodeId);
    if (!depInstanceIds || depInstanceIds.length === 0) {
        memoizationMap.set(nodeId, { depTree });
        return [depTree, undefined];
    }
    const cycle = (0, cycles_1.getCycle)(ancestors, nodeId);
    if (cycle) {
        // This node starts a cycle and now it's the second visit.
        addLabel(depTree, 'pruned', 'cyclic');
        return [depTree, [cycle]];
    }
    if (maybeDeduplicationSet) {
        if (maybeDeduplicationSet.has(nodeId)) {
            if (depInstanceIds.length > 0) {
                addLabel(depTree, 'pruned', 'true');
            }
            return [depTree, undefined];
        }
        maybeDeduplicationSet.add(nodeId);
    }
    const cycles = [];
    for (const depInstId of depInstanceIds) {
        // Deduplication of nodes occurs only within a scope of a top-level dependency.
        // Therefore, every top-level dep gets an independent set to track duplicates.
        if (isRoot && maybeDeduplicationSet !== false) {
            maybeDeduplicationSet = new Set();
        }
        const [subtree, subtreeCycles] = await buildSubtree(depGraph, depInstId, maybeDeduplicationSet, ancestors.concat(nodeId), memoizationMap);
        if (subtreeCycles) {
            for (const cycle of subtreeCycles) {
                cycles.push(cycle);
            }
        }
        if (!subtree) {
            continue;
        }
        if (!depTree.dependencies) {
            depTree.dependencies = {};
        }
        depTree.dependencies[subtree.name] = subtree;
    }
    if (event_loop_spinner_1.eventLoopSpinner.isStarving()) {
        await event_loop_spinner_1.eventLoopSpinner.spin();
    }
    const partitionedCycles = (0, cycles_1.partitionCycles)(nodeId, cycles);
    (0, memiozation_1.memoize)(nodeId, memoizationMap, depTree, partitionedCycles);
    return [depTree, partitionedCycles.cyclesWithThisNode];
}
function trimAfterLastSep(str, sep) {
    return str.slice(0, str.lastIndexOf(sep));
}
//# sourceMappingURL=index.js.map