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
            default: return 'default';
        }
    };

    return (
        <SimpleLayout>
            <div className="bg-gradient-to-r from-[#6B240C] to-[#994D1C] py-12 px-6 text-center text-white mb-6">
                <h1 className="text-4xl font-bold mb-4">Danh Sách Văn Bản Quy Phạm Pháp Luật</h1>
                <p className="text-xl opacity-90 italic">
                    Tra cứu toàn văn các văn bản luật, nghị định, thông tư mới nhất.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-4 pb-12">
                <Card className="mb-6 shadow-md">
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={10}>
                            <Search 
                                placeholder="Nhập từ khóa tìm kiếm (VD: đất đai, thuế...)" 
                                enterButton={<Button icon={<SearchOutlined />}>Tìm kiếm</Button>}
                                size="large"
                                onSearch={handleSearch}
                                loading={loading}
                            />
                        </Col>
                        <Col xs={12} md={5}>
                            <Select 
                                placeholder="Loại văn bản" 
                                style={{ width: '100%' }} 
                                size="large"
                                allowClear
                                onChange={(val) => { setDocType(val); setPage(1); }}
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
                            />
                        </Col>
                        <Col xs={24} md={4} className="text-right">
                             <Button icon={<FilterOutlined />} onClick={fetchDocuments}>Lọc</Button>
                        </Col>
                    </Row>
                </Card>

                {loading ? (
                    <div className="text-center py-12"><Spin size="large" /></div>
                ) : documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {documents.map(doc => (
                            <Card 
                                key={doc.id}
                                hoverable
                                className="h-full flex flex-col shadow-sm hover:shadow-xl transition-all border-t-4 border-t-orange-600"
                                onClick={() => navigate(`/vbpl/${doc.id}`)}
                                title={
                                    <div className="whitespace-normal h-14 overflow-hidden text-ellipsis line-clamp-2" title={doc.title}>
                                        {doc.title}
                                    </div>
                                }
                                extra={<Tag color={getTypeColor(doc.type)}>{doc.type}</Tag>}
                            >
                                <div className="flex flex-col h-full justify-between">
                                    <div className="mb-4 text-gray-600 line-clamp-3">
                                        {doc.number && <p className="font-semibold text-black mb-1">{doc.number}</p>}
                                        <p>Cơ quan: {doc.authority || 'N/A'}</p>
                                        <p>Ban hành: {doc.year || 'N/A'}</p>
                                    </div>
                                    <div className="text-right mt-auto">
                                        <Button type="link" className="px-0 text-orange-700">Xem chi tiết &rarr;</Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 bg-white rounded-lg shadow-sm">
                        <Empty description="Không tìm thấy văn bản nào phù hợp" />
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Pagination 
                        current={page} 
                        pageSize={pageSize} 
                        total={total} 
                        onChange={(p, s) => { setPage(p); setPageSize(s); }}
                        showSizeChanger
                    />
                </div>
            </div>
        </SimpleLayout>
    );
};

export default VBPLPage;
