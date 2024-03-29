import * as graphlib from '../graphlib';
import * as types from './types';
export { DepGraphImpl };
declare type NodeId = string;
declare type PkgId = string;
declare class DepGraphImpl implements types.DepGraphInternal {
    private _graph;
    private _rootNodeId;
    private _pkgs;
    private _pkgNodes;
    private _pkgManager;
    static SCHEMA_VERSION: string;
    static getPkgId(pkg: types.Pkg): string;
    private _pkgList;
    private _depPkgsList;
    private _rootPkgId;
    private _countNodePathsToRootCache;
    private _hasCycles;
    constructor(_graph: graphlib.Graph, _rootNodeId: NodeId, _pkgs: Record<PkgId, types.PkgInfo>, _pkgNodes: Record<PkgId, Set<NodeId>>, _pkgManager: types.PkgManager);
    get pkgManager(): types.PkgManager;
    get rootPkg(): types.PkgInfo;
    get rootNodeId(): string;
    /**
     * Get all unique packages in the graph (including the root package)
     */
    getPkgs(): types.PkgInfo[];
    /**
     * Get all unique packages in the graph (excluding the root package)
     */
    getDepPkgs(): types.PkgInfo[];
    getPkgNodes(pkg: types.Pkg): types.Node[];
    getNode(nodeId: string): types.NodeInfo;
    getNodePkg(nodeId: string): types.PkgInfo;
    getPkgNodeIds(pkg: types.Pkg): string[];
    getNodeDepsNodeIds(nodeId: string): string[];
    getNodeParentsNodeIds(nodeId: string): string[];
    hasCycles(): boolean;
    pkgPathsToRoot(pkg: types.Pkg, opts?: {
        limit?: number;
    }): types.PkgInfo[][];
    countPathsToRoot(pkg: types.Pkg): number;
    isTransitive(pkg: types.Pkg): boolean;
    equals(other: types.DepGraph, { compareRoot }?: {
        compareRoot?: boolean;
    }): boolean;
    directDepsLeadingTo(pkg: types.Pkg): types.PkgInfo[];
    /**
     * Create a JSON representation of a dep graph. This is typically used to
     * send the dep graph over the wire
     */
    toJSON(): types.DepGraphData;
    private nodeEquals;
    private getGraphNode;
    private pathsFromNodeToRoot;
    private countNodePathsToRoot;
}
