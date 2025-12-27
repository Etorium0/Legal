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
                    <Spin size="large" tip="Đang tải văn bản..." />
                </div>
            </SimpleLayout>
        );
    }

    if (!document) 
    {
        return (
            <SimpleLayout>
                <div className="text-center py-20">
                    <Title level={3}>Không tìm thấy văn bản</Title>
                    <Button onClick={() => navigate('/vbpl')}>Quay lại danh sách</Button>
                </div>
            </SimpleLayout>
        );
    }

    return (
        <SimpleLayout>
            <div className="max-w-5xl mx-auto px-4 py-8">
                <Breadcrumb className="mb-6">
                    <Breadcrumb.Item>
                        <a onClick={() => navigate('/')}>Trang chủ</a>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>
                        <a onClick={() => navigate('/vbpl')}>Văn bản pháp luật</a>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>{document.number || document.title}</Breadcrumb.Item>
                </Breadcrumb>

                <div className="bg-white rounded-lg shadow-lg p-8 min-h-screen">
                    {/* Header */}
                    <div className="text-center mb-8 border-b pb-8">
                        <Title level={2} className="text-blue-900 mb-4">{document.title}</Title>
                        
                        <div className="flex justify-center gap-4 flex-wrap mb-4">
                            {document.number && <Tag color="blue" className="text-lg py-1 px-3">Số: {document.number}</Tag>}
                            {document.type && <Tag color="green" className="text-lg py-1 px-3">{document.type}</Tag>}
                            {document.authority && <Tag color="orange" className="text-lg py-1 px-3">{document.authority}</Tag>}
                            {document.year && <Tag color="default" className="text-lg py-1 px-3">Năm: {document.year}</Tag>}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="prose max-w-none text-justify font-serif leading-relaxed text-gray-800">
                        {units.length > 0 ? (
                            units.map(unit => renderUnit(unit))
                        ) : (
                            <Empty description="Nội dung văn bản chưa được cập nhật" />
                        )}
                    </div>
                </div>
            </div>
        </SimpleLayout>
    );
};

export default VBPLDetailPage;
