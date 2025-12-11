import React, { useEffect, useRef } from 'react';
import { 
  select, 
  forceSimulation, 
  forceLink, 
  forceManyBody, 
  forceCenter, 
  forceCollide, 
  drag 
} from 'd3';
import { Triple, GraphNode, GraphLink } from '../types';

interface GraphViewProps {
  triples: Triple[];
}

const GraphView: React.FC<GraphViewProps> = ({ triples }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triples.length || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear previous graph
    select(svgRef.current).selectAll("*").remove();

    // Process triples into nodes and links
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeSet = new Set<string>();

    triples.forEach(t => {
      if (!nodeSet.has(t.subject)) {
        nodes.push({ id: t.subject, group: 1 });
        nodeSet.add(t.subject);
      }
      if (!nodeSet.has(t.object)) {
        nodes.push({ id: t.object, group: 2 });
        nodeSet.add(t.object);
      }
      links.push({ source: t.subject, target: t.object, relation: t.relation });
    });

    const svg = select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Force simulation
    const simulation = forceSimulation<GraphNode>(nodes)
      .force("link", forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(150))
      .force("charge", forceManyBody().strength(-400))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide(50));

    // Arrow marker
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#999")
      .attr("d", "M0,-5L10,0L0,5");

    // Links
    const link = svg.append("g")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");

    // Link Labels
    const linkLabel = svg.append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .text(d => d.relation)
      .attr("font-size", 10)
      .attr("fill", "#aaa")
      .attr("text-anchor", "middle");

    // Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call((drag<SVGGElement, GraphNode>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)) as any);

    node.append("circle")
      .attr("r", 20)
      .attr("fill", d => d.group === 1 ? "#3b82f6" : "#10b981")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    node.append("text")
      .text(d => d.id)
      .attr("x", 25)
      .attr("y", 5)
      .attr("font-size", 12)
      .attr("fill", "#fff")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      linkLabel
        .attr("x", d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr("y", d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [triples]);

  if (triples.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Chưa có dữ liệu đồ thị tri thức. Hãy đặt câu hỏi để phân tích.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-darker rounded-xl overflow-hidden border border-gray-700">
      <div className="absolute top-4 left-4 z-10 bg-black/50 p-2 rounded text-xs text-gray-300">
        Knowledge Graph Visualization
      </div>
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};

export default GraphView;
