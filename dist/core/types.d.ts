export interface Pkg {
    name: string;
    version?: string;
}
export declare type PurlString = string;
export interface PkgInfo {
    name: string;
    version?: string;
    purl?: PurlString;
}
export interface VersionProvenance {
    type: string;
    location: string;
    property?: {
        name: string;
    };
}
export interface NodeInfo {
    versionProvenance?: VersionProvenance;
    labels?: {
        [key: string]: string | undefined;
        scope?: 'dev' | 'prod';
        pruned?: 'cyclic' | 'true';
    };
}
export interface Node {
    info: NodeInfo;
}
export interface GraphNode {
    nodeId: string;
    pkgId: string;
    info?: NodeInfo;
    deps: Array<{
        nodeId: string;
    }>;
}
export interface PkgManager {
    name: string;
    version?: string;
    repositories?: Array<{
        alias: string;
    }>;
}
export interface DepGraphData {
    schemaVersion: string;
    pkgManager: PkgManager;
    pkgs: Array<{
        id: string;
        info: PkgInfo;
    }>;
    graph: {
        rootNodeId: string;
        nodes: GraphNode[];
    };
}
export interface DepGraph {
    readonly pkgManager: PkgManager;
    readonly rootPkg: PkgInfo;
    getPkgs(): PkgInfo[];
    getDepPkgs(): PkgInfo[];
    getPkgNodes(pkg: Pkg): Node[];
    toJSON(): DepGraphData;
    pkgPathsToRoot(pkg: Pkg, opts?: {
        limit?: number;
    }): PkgInfo[][];
    isTransitive(pkg: Pkg): boolean;
    directDepsLeadingTo(pkg: Pkg): PkgInfo[];
    countPathsToRoot(pkg: Pkg): number;
    equals(other: DepGraph, options?: {
        compareRoot?: boolean;
    }): boolean;
}
export interface DepGraphInternal extends DepGraph {
    readonly rootNodeId: string;
    getNode(nodeId: string): NodeInfo;
    getNodePkg(nodeId: string): PkgInfo;
    getPkgNodeIds(pkg: Pkg): string[];
    getNodeDepsNodeIds(nodeId: string): string[];
    getNodeParentsNodeIds(nodeId: string): string[];
    hasCycles(): boolean;
}
