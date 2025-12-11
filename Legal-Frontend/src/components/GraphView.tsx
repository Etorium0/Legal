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

const GraphView: React.FC<GraphViewProps> = ({ triples }) => 
{
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => 
{
    if (!triples.length || !svgRef.current || !containerRef.current) {return;}

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear previous graph
    select(svgRef.current).selectAll("*").remove();

    // Process triples into nodes and links
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeSet = new Set<string>();

    triples.forEach(t => 
{
      if (!nodeSet.has(t.subject)) 
{
        nodes.push({ id: t.subject, group: 1 });
        nodeSet.add(t.subject);
      }
      if (!nodeSet.has(t.object)) 
{
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
      .attr("stroke-width", 2);

    node.append("text")
      .text(d => d.id.length > 15 ? d.id.substring(0, 15) + '...' : d.id)
      .attr("font-size", 12)
      .attr("dy", 35)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff");

    // Simulation tick
    simulation.on("tick", () => 
{
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: any) 
{
      if (!event.active) {simulation.alphaTarget(0.3).restart();}
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) 
{
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) 
{
      if (!event.active) {simulation.alphaTarget(0);}
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => 
{
      simulation.stop();
    };
  }, [triples]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-darker rounded-lg">
      {triples.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          <p>Chưa có dữ liệu Knowledge Graph. Hãy hỏi câu hỏi pháp luật để xem biểu đồ.</p>
        </div>
      ) : (
        <svg ref={svgRef} className="w-full h-full"></svg>
      )}
    </div>
  );
};

export default GraphView;
