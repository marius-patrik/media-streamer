declare module "dagre" {
  export namespace graphlib {
    class Graph {
      setGraph(value: unknown): void;
      setDefaultEdgeLabel(callback: () => unknown): void;
      setNode(id: string, value: unknown): void;
      setEdge(source: string, target: string): void;
      node(id: string): unknown;
      nodes(): string[];
    }
  }

  export function layout(graph: graphlib.Graph): void;
}
