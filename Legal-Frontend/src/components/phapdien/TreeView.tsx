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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => 
{
        loadInitialData();
    }, []);

    const loadInitialData = async () => 
{
        setLoading(true);
        setError(null);
        try 
{
            // Fetch documents with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
            
            const res = await lawService.getDocuments({ limit: 100 }); // Reduced for mobile performance
            clearTimeout(timeoutId);
            const docs: Document[] = res.items || [];

            // Group by Document Type (Luật, Nghị định, Thông tư, etc.)
            const typeGroups: Record<string, Document[]> = {};
            docs.forEach(doc => 
{
                const docType = doc.type || 'Khác';
                if (!typeGroups[docType]) {typeGroups[docType] = [];}
                typeGroups[docType].push(doc);
            });

            // Sort types for consistent ordering
            const typeOrder = ['Luật', 'Nghị định', 'Thông tư', 'Quyết định', 'Khác'];
            const sortedTypes = Object.keys(typeGroups).sort((a, b) => 
            {
                const indexA = typeOrder.indexOf(a);
                const indexB = typeOrder.indexOf(b);
                if (indexA === -1 && indexB === -1) 
                    {return a.localeCompare(b);}
                if (indexA === -1) 
                    {return 1;}
                if (indexB === -1) 
                    {return -1;}
                return indexA - indexB;
            });

            // Build Tree Nodes grouped by type
            const nodes: DataNode[] = sortedTypes.map((docType, index) => ({
                title: `${docType} (${typeGroups[docType].length})`,
                key: `type_${index}`,
                isLeaf: false,
                children: typeGroups[docType].slice(0, 100).map(doc => ({ // Limit to 100 per type for performance
                    title: `${doc.number ? doc.number + ': ' : ''}${doc.title}`.substring(0, 100),
                    key: `doc_${doc.id}`,
                    isLeaf: false,
                    data: doc
                }))
            }));

            setTreeData(nodes);
        }
 catch (err: any) 
{
            console.error("Failed to load documents tree:", err);
            setError(err?.name === 'AbortError' ? 'Kết nối timeout. Vui lòng thử lại.' : 'Không thể tải dữ liệu. Kiểm tra kết nối mạng.');
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
                    // Only show text, hide long code IDs
                    const title = unit.text || unit.level || 'Unit';

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

    const onSelect = (_selectedKeys: React.Key[], info: any) =>
{
        const node = info.node;
        console.log('[TreeView] Selected node:', node.key, 'Data:', node.data);

        if (!node.data) 
{
            console.log('[TreeView] No data on node');
            return;
        }

        // Check if it's a unit
        if (String(node.key).startsWith('unit_'))
{
            const unit = node.data as Unit;
            console.log('[TreeView] Unit selected:', unit.level, 'Children count:', unit.children?.length || 0);

            // If it's a chapter with children, show them
            if (unit.children && unit.children.length > 0)
{
                console.log('[TreeView] Calling onSelectChuong with', unit.children.length, 'children');
                onSelectChuong(unit, unit.children);
            }
 else
{
                // If it's a unit without children (leaf node), load its children
                console.log('[TreeView] Unit has no children, trying to load...');
                // Try to pass unit itself as both chapter and single article
                onSelectChuong(unit, [unit]);
            }
        }
    };

    return (
        <div className="h-full overflow-auto bg-slate-800 p-4 rounded-lg">
            {loading ? (
                <div className="flex flex-col items-center justify-center p-8 gap-4">
                    <Spin size="large" />
                    <p className="text-white/70">Đang tải danh sách văn bản...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center p-8 gap-4">
                    <Empty description={<span className="text-red-400">{error}</span>} />
                    <button onClick={loadInitialData} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500">Thử lại</button>
                </div>
            ) : treeData.length > 0 ? (
                <Tree
                    showLine
                    switcherIcon={<DownOutlined />}
                    treeData={treeData}
                    loadData={onLoadData}
                    onSelect={onSelect}
                    className="bg-slate-800 text-white"
                    style={{ background: 'transparent' }}
                />
            ) : (
                <Empty description={<span className="text-white/70">Không có dữ liệu</span>} />
            )}
        </div>
    );
};

export default TreeView;
