export interface GraphOptions {
    directed?: boolean;
    multigraph?: boolean;
    compound?: boolean;
}
export interface Edge {
    v: string;
    w: string;
    /** The name that uniquely identifies a multi-edge. */
    name?: string;
}
export declare class Graph {
    _isDirected: any;
    _isMultigraph: any;
    _isCompound: any;
    _label: any;
    _defaultNodeLabelFn: any;
    _defaultEdgeLabelFn: any;
    _nodes: {
        [key: string]: unknown;
    };
    _parent: any;
    _children: any;
    _in: any;
    _preds: any;
    _out: any;
    _sucs: any;
    _edgeObjs: any;
    _edgeLabels: {
        [key: string]: unknown;
    };
    constructor(opts: GraphOptions);
    _nodeCount: number;
    _edgeCount: number;
    isDirected(): any;
    isMultigraph(): any;
    isCompound(): any;
    setGraph(label: any): this;
    graph(): any;
    setDefaultNodeLabel(newDefault: any): this;
    nodeCount(): number;
    nodes(): string[];
    sources(): any;
    sinks(): any;
    setNodes(vs: any, value: any): this;
    setNode(v: any, value?: any): this;
    node(v: any): unknown;
    hasNode(v: string): boolean;
    removeNode(v: any): this;
    setParent(v: any, parent?: any): this;
    _removeFromParentsChildList(v: any): void;
    parent(v: any): any;
    children(v: any): string[] | undefined;
    predecessors(v: any): string[] | undefined;
    successors(v: any): string[] | undefined;
    neighbors(v: any): any;
    isLeaf(v: any): boolean;
    filterNodes(filter: any): Graph;
    setDefaultEdgeLabel(newDefault: any): this;
    edgeCount(): number;
    edges(): any;
    setPath(vs: any, value: any): this;
    setEdge(v: string, w: string, label?: any, name?: string): Graph;
    setEdge(edge: Edge, label?: any): Graph;
    edge(v: any, w?: any, name?: any): unknown;
    hasEdge(v: any, w: any, name: any): boolean;
    removeEdge(v: any, w?: any, name?: any): this;
    inEdges(v: any, u: any): any;
    outEdges(v: any, w: any): any;
    nodeEdges(v: any, w: any): any;
}
