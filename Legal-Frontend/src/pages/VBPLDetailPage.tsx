import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Button, Breadcrumb, Tag, Typography, Empty } from 'antd';
import SimpleLayout from '../components/SimpleLayout';
import { lawService, Document, Unit } from '../services/lawService';
import MarkdownIt from 'markdown-it';

const { Title } = Typography;
const md = new MarkdownIt({ html: true, breaks: true });

const VBPLDetailPage: React.FC = () => 
{
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [document, setDocument] = useState<Document | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => 
    {
        if (id) 
        {
            fetchData(id);
        }
    }, [id]);

    const fetchData = async (docId: string) => 
    {
        setLoading(true);
        try 
        {
            // First fetch document metadata
            const docRes = await lawService.getDocument(docId);
            setDocument(docRes);

            // Try to fetch tree structure
            let treeRes = await lawService.getDocumentTree(docId);
            
            // If tree is empty, fallback to flat units list
            if (!treeRes || treeRes.length === 0) 
            {
                const unitsRes = await lawService.getUnits(docId, 1000);
                treeRes = unitsRes.items || [];
            }
            
            setUnits(treeRes);
        } 
        catch (error) 
        {
            console.error("Failed to fetch document details:", error);
        } 
        finally 
        {
            setLoading(false);
        }
    };

    const renderUnit = (unit: Unit, depth = 0) => 
    {
        const isChapter = unit.level === 'chapter' || unit.level === 'Chuong';
        const isPart = unit.level === 'part' || unit.level === 'Phan';
        
        const style = {
            marginLeft: `${depth * 20}px`,
            marginBottom: '16px'
        };

        if (isPart) 
        {
            return (
                <div key={unit.id} style={style} className="mt-8 mb-4 border-b-2 border-red-200 pb-2">
                    <div className="text-2xl text-red-700 uppercase font-bold">
                        {unit.code && <span className="mr-2">{unit.code}</span>}
                        {unit.text}
                    </div>
                    {renderChildren(unit, depth)}
                </div>
            );
        }

        if (isChapter) 
        {
            return (
                <div key={unit.id} style={style} className="mt-6 mb-3">
                    <div className="text-xl text-blue-700 font-bold">
                        {unit.code && <span className="mr-2">{unit.code}</span>}
                        {unit.text}
                    </div>
                    {renderChildren(unit, depth)}
                </div>
            );
        }

        return (
            <div key={unit.id} style={style} id={`unit-${unit.id}`} className="mb-2">
                <div 
                    className="text-gray-800 leading-relaxed text-lg"
                    dangerouslySetInnerHTML={{ __html: md.render(unit.text || '') }}
                />
                {renderChildren(unit, depth)}
            </div>
        );
    };

    const renderChildren = (unit: Unit, depth: number) => 
    {
        if (unit.children && unit.children.length > 0) 
        {
            return (
                <div className="mt-2">
                    {unit.children.map(child => renderUnit(child, depth + 1))}
                </div>
            );
        }
        return null;
    };

    if (loading) 
    {
        return (
            <SimpleLayout>
                <div className="flex justify-center items-center h-screen">
                    <Spin size="large" tip="Đang tải văn bản..." className="text-white" />
                </div>
            </SimpleLayout>
        );
    }

    if (!document) 
    {
        return (
            <SimpleLayout>
                <div className="text-center py-20 text-white">
                    <Title level={3} className="text-white">Không tìm thấy văn bản</Title>
                    <Button onClick={() => navigate('/vbpl')} ghost>Quay lại danh sách</Button>
                </div>
            </SimpleLayout>
        );
    }

    return (
        <SimpleLayout>
            <div className="max-w-5xl mx-auto px-4 py-8">
                <Breadcrumb className="mb-6 text-gray-300">
                    <Breadcrumb.Item>
                        <a onClick={() => navigate('/')} className="text-gray-400 hover:text-white">Trang chủ</a>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>
                        <a onClick={() => navigate('/vbpl')} className="text-gray-400 hover:text-white">Văn bản pháp luật</a>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item className="text-gray-200">{document.number || document.title}</Breadcrumb.Item>
                </Breadcrumb>

                <div className="bg-slate-800/80 backdrop-blur-md rounded-lg shadow-lg p-8 min-h-screen border border-white/10">
                    {/* Header */}
                    <div className="text-center mb-8 border-b border-white/10 pb-8">
                        <Title level={2} className="text-indigo-300 mb-4" style={{color: '#a5b4fc'}}>{document.title}</Title>
                        
                        <div className="flex justify-center gap-4 flex-wrap mb-4">
                            {document.number && <Tag color="blue" className="text-lg py-1 px-3 border-none bg-blue-500/20 text-blue-200">Số: {document.number}</Tag>}
                            {document.type && <Tag color="green" className="text-lg py-1 px-3 border-none bg-green-500/20 text-green-200">{document.type}</Tag>}
                            {document.authority && <Tag color="orange" className="text-lg py-1 px-3 border-none bg-orange-500/20 text-orange-200">{document.authority}</Tag>}
                            {document.year && <Tag color="default" className="text-lg py-1 px-3 border-none bg-gray-600 text-gray-200">Năm: {document.year}</Tag>}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="prose max-w-none text-justify font-serif leading-relaxed text-gray-200 prose-headings:text-indigo-300 prose-strong:text-white prose-a:text-blue-400">
                        {units.length > 0 ? (
                            units.map(unit => renderUnit(unit))
                        ) : (
                            <Empty description={<span className="text-gray-400">Nội dung văn bản chưa được cập nhật</span>} />
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                .ant-breadcrumb-separator { color: rgba(255,255,255,0.4) !important; }
            `}</style>
        </SimpleLayout>
    );
};

export default VBPLDetailPage;
