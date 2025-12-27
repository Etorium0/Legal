import React, { useEffect, useState } from 'react';
import { Tree, Spin, Empty } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { lawService, Document, Unit } from '../../services/lawService';

interface DataNode {
    title: string;
    key: string;
    isLeaf?: boolean;
    children?: DataNode[];
    data?: any; // Store original data
}

interface TreeViewProps {
    onSelectChuong: (chuong: Unit, dieus: Unit[]) => void;
}

const TreeView: React.FC<TreeViewProps> = ({ onSelectChuong }) => 
{
    const [treeData, setTreeData] = useState<DataNode[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => 
{
        loadInitialData();
    }, []);

    const loadInitialData = async () => 
{
        setLoading(true);
        try 
{
            // Fetch all Phap Dien documents (De Muc)
            // Assuming type 'code' represents Phap Dien documents
            const res = await lawService.getDocuments({ type: 'code', limit: 1000 });
            const docs: Document[] = res.items || [];

            // Group by Authority (Chu De)
            const themes: Record<string, Document[]> = {};
            docs.forEach(doc => 
{
                const theme = doc.authority || 'Khác';
                if (!themes[theme]) {themes[theme] = [];}
                themes[theme].push(doc);
            });

            // Build Tree Nodes
            const nodes: DataNode[] = Object.keys(themes).map((theme, index) => ({
                title: theme,
                key: `theme_${index}`,
                isLeaf: false,
                children: themes[theme].map(doc => ({
                    title: `${doc.number ? doc.number + ': ' : ''}${doc.title}`,
                    key: `doc_${doc.id}`,
                    isLeaf: false,
                    data: doc
                }))
            }));

            setTreeData(nodes);
        }
 catch (error) 
{
            console.error("Failed to load Phap Dien tree:", error);
        }
 finally 
{
            setLoading(false);
        }
    };

    const onLoadData = async ({ key, children, data }: any) => 
{
        if (children && children.length > 0) {return;}
        
        // If it's a Document (De Muc), load its Tree (Chapters/Articles)
        if (key.toString().startsWith('doc_')) 
{
            const docId = data.id;
            try 
{
                const treeUnits = await lawService.getDocumentTree(docId);
                
                // Map Units to Tree Nodes
                // Hierarchy: Document -> Chapter -> Article
                // The treeUnits might already be nested if the backend supports it, 
                // but getDocumentTree usually returns a flat list or nested list.
                // Assuming getDocumentTree returns a nested structure starting from root units.
                
                const mapUnitToNode = (unit: Unit): DataNode => 
{
                    const isChapter = unit.level === 'chapter' || unit.level === 'Chuong';
                    const title = `${unit.code ? unit.code + ' ' : ''}${unit.text}`;
                    
                    return {
                        title: title,
                        key: `unit_${unit.id}`,
                        isLeaf: !isChapter, // Chapters are not leaves, Articles are leaves (in tree view)
                        data: unit,
                        children: unit.children ? unit.children.map(mapUnitToNode) : undefined
                    };
                };

                const childNodes = treeUnits.map(mapUnitToNode);
                
                setTreeData(origin => updateTreeData(origin, key, childNodes));
            }
 catch (error) 
{
                console.error("Failed to load document tree:", error);
            }
        }
    };

    const updateTreeData = (list: DataNode[], key: React.Key, children: DataNode[]): DataNode[] => 
{
        return list.map(node => 
{
            if (node.key === key) 
{
                return { ...node, children };
            }
            if (node.children) 
{
                return { ...node, children: updateTreeData(node.children, key, children) };
            }
            return node;
        });
    };

    const onSelect = (selectedKeys: React.Key[], info: any) => 
{
        const node = info.node;
        if (!node.data) {return;}

        // If selected node is a Chapter (or has children which are articles)
        // In this UI, selecting a Chapter should show its Articles in the reader
        
        // Check if it's a unit
        if (String(node.key).startsWith('unit_')) 
{
            const unit = node.data as Unit;
            // If it's a chapter, pass it to parent
            if (unit.children && unit.children.length > 0) 
{
                 onSelectChuong(unit, unit.children);
            }
 else 
{
                // If it's an article, maybe scroll to it?
                // For now just handle chapters as the container for reading
            }
        }
    };

    return (
        <div className="h-full overflow-auto bg-white p-4 rounded-lg shadow">
            {loading && treeData.length === 0 ? (
                <div className="flex justify-center p-4"><Spin /></div>
            ) : treeData.length > 0 ? (
                <Tree
                    showLine
                    switcherIcon={<DownOutlined />}
                    treeData={treeData}
                    loadData={onLoadData}
                    onSelect={onSelect}
                    height={600}
                />
            ) : (
                <Empty description="Không có dữ liệu pháp điển" />
            )}
        </div>
    );
};

export default TreeView;
