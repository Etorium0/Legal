import React, { useEffect, useState } from 'react';
import { Card, Input, Select, Pagination, Tag, Row, Col, Spin, Empty, Button } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import SimpleLayout from '../components/SimpleLayout';
import { lawService, Document } from '../services/lawService';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

const VBPLPage: React.FC = () => 
{
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    
    // Filters
    const [searchText, setSearchText] = useState('');
    const [docType, setDocType] = useState<string | undefined>(undefined);
    const [year, setYear] = useState<number | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const fetchDocuments = async () => 
{
        setLoading(true);
        try 
{
            const res = await lawService.getDocuments({
                search: searchText,
                type: docType,
                year_from: year, // Simple year filter
                year_to: year,
                page,
                limit: pageSize
            });
            setDocuments(res.items || []);
            setTotal(res.total || 0);
        }
 catch (error) 
{
            console.error("Failed to fetch documents:", error);
        }
 finally 
{
            setLoading(false);
        }
    };

    useEffect(() => 
{
        fetchDocuments();
    }, [page, pageSize, docType, year]); // Trigger on filter change (except search text which is manual)

    const handleSearch = (value: string) => 
{
        setSearchText(value);
        setPage(1);
        fetchDocuments();
    };

    const getTypeColor = (type: string) => 
    {
        switch (type?.toLowerCase()) 
        {
            case 'luật': return 'red';
            case 'nghị định': return 'blue';
            case 'thông tư': return 'green';
            case 'quyết định': return 'orange';
            case 'chỉ thị': return 'purple';
            case 'nghị quyết': return 'cyan';
            default: return 'default';
        }
    };

    return (
        <SimpleLayout>
            <div className="bg-gradient-to-r from-[#6B240C] to-[#994D1C] py-12 px-6 text-center text-white mb-6 rounded-xl shadow-lg mx-4 mt-4">
                <h1 className="text-4xl font-bold mb-4">Danh Sách Văn Bản Quy Phạm Pháp Luật</h1>
                <p className="text-xl opacity-90 italic">
                    Tra cứu toàn văn các văn bản luật, nghị định, thông tư mới nhất.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-4 pb-12">
                <div className="mb-6 bg-slate-800/50 p-6 rounded-xl border border-white/10 backdrop-blur-md">
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={10}>
                            <Search 
                                placeholder="Nhập từ khóa tìm kiếm (VD: đất đai, thuế...)" 
                                enterButton={<Button type="primary" icon={<SearchOutlined />}>Tìm kiếm</Button>}
                                size="large"
                                onSearch={handleSearch}
                                loading={loading}
                                className="dark-search"
                            />
                        </Col>
                        <Col xs={12} md={5}>
                            <Select 
                                placeholder="Loại văn bản" 
                                style={{ width: '100%' }} 
                                size="large"
                                allowClear
                                onChange={(val) => { setDocType(val); setPage(1); }}
                                className="dark-select"
                            >
                                <Option value="Luật">Luật</Option>
                                <Option value="Nghị định">Nghị định</Option>
                                <Option value="Thông tư">Thông tư</Option>
                                <Option value="Quyết định">Quyết định</Option>
                                <Option value="Chỉ thị">Chỉ thị</Option>
                            </Select>
                        </Col>
                        <Col xs={12} md={5}>
                             <Input 
                                type="number" 
                                placeholder="Năm ban hành" 
                                size="large" 
                                onChange={(e) => 
                                { 
                                    const val = e.target.value ? parseInt(e.target.value) : undefined;
                                    setYear(val); 
                                    setPage(1);
                                }}
                                className="dark-input"
                            />
                        </Col>
                        <Col xs={24} md={4} className="text-right">
                             <Button icon={<FilterOutlined />} onClick={fetchDocuments} ghost className="text-white border-white hover:text-orange-400 hover:border-orange-400">Lọc</Button>
                        </Col>
                    </Row>
                </div>

                {loading ? (
                    <div className="text-center py-12"><Spin size="large" className="dark-spin" /></div>
                ) : documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {documents.map(doc => (
                            <div 
                                key={doc.id}
                                className="h-full flex flex-col bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden hover:bg-slate-700/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-orange-500/20"
                                onClick={() => navigate(`/vbpl/${doc.id}`)}
                            >
                                <div className="p-4 border-b border-white/10 flex justify-between items-start gap-2">
                                    <div className="flex-1 font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-2" title={doc.title}>
                                        {doc.title}
                                    </div>
                                    <Tag color={getTypeColor(doc.type)} className="m-0 shrink-0">{doc.type}</Tag>
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-between text-gray-300">
                                    <div className="mb-4 text-sm space-y-1">
                                        {doc.number && <p><span className="text-gray-500">Số hiệu:</span> <span className="text-white font-medium">{doc.number}</span></p>}
                                        <p><span className="text-gray-500">Cơ quan:</span> {doc.authority || 'N/A'}</p>
                                        <p><span className="text-gray-500">Ban hành:</span> {doc.year || 'N/A'}</p>
                                    </div>
                                    <div className="text-right mt-auto">
                                        <span className="text-sm text-orange-400 group-hover:translate-x-1 transition-transform inline-block">Xem chi tiết &rarr;</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 bg-slate-800/50 rounded-lg shadow-sm border border-white/10 text-center">
                        <Empty description={<span className="text-gray-400">Không tìm thấy văn bản nào phù hợp</span>} />
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Pagination 
                        current={page} 
                        pageSize={pageSize} 
                        total={total} 
                        onChange={(p, s) => { setPage(p); setPageSize(s); }}
                        showSizeChanger
                        className="dark-pagination"
                    />
                </div>
            </div>
            <style>{`
                .dark-pagination .ant-pagination-item a { color: rgba(255,255,255,0.8); }
                .dark-pagination .ant-pagination-item-active { background: transparent; border-color: #f97316; }
                .dark-pagination .ant-pagination-item-active a { color: #f97316; }
                .dark-pagination .ant-pagination-prev .ant-pagination-item-link,
                .dark-pagination .ant-pagination-next .ant-pagination-item-link { color: rgba(255,255,255,0.6); background: transparent; border-color: rgba(255,255,255,0.2); }
                .dark-input input { background: rgba(0,0,0,0.2) !important; color: white !important; border-color: rgba(255,255,255,0.2) !important; }
                .dark-select .ant-select-selector { background: rgba(0,0,0,0.2) !important; color: white !important; border-color: rgba(255,255,255,0.2) !important; }
                .dark-select .ant-select-arrow { color: white; }
                .dark-search .ant-input { background: rgba(0,0,0,0.2) !important; color: white !important; border-color: rgba(255,255,255,0.2) !important; }
            `}</style>
        </SimpleLayout>
    );
};

export default VBPLPage;
