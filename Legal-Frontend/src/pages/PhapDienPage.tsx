import { MenuOutlined } from '@ant-design/icons';
import { Button, Drawer, Layout, Typography } from 'antd';
import React, { useState } from 'react';
import SimpleLayout from '../components/SimpleLayout';
import ChuongReader from '../components/phapdien/ChuongReader';
import TreeView from '../components/phapdien/TreeView';
import { Unit } from '../services/lawService';

const { Title } = Typography;

const PhapDienPage: React.FC = () => 
{
    const [selectedChuong, setSelectedChuong] = useState<Unit | null>(null);
    const [selectedDieus, setSelectedDieus] = useState<Unit[]>([]);
    const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);

    const handleSelectChuong = (chuong: Unit, dieus: Unit[]) => 
    {
        setSelectedChuong(chuong);
        setSelectedDieus(dieus);
        setMobileDrawerVisible(false);
    };

    return (
        <SimpleLayout>
            <div className="h-[calc(100vh-64px)] flex flex-col">
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white shadow-md flex items-center justify-between">
                    <div>
                        <Title level={2} style={{ color: 'white', margin: 0 }}>
                            Bộ Pháp Điển Việt Nam
                        </Title>
                        <p className="mt-2 opacity-90">
                            Tra cứu hệ thống pháp luật được sắp xếp theo chủ đề, đề mục, chương, điều.
                        </p>
                    </div>
                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <Button
                            type="primary"
                            icon={<MenuOutlined />}
                            onClick={() => setMobileDrawerVisible(true)}
                        >
                            Danh mục
                        </Button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden p-4 gap-4 bg-slate-900/50 relative">
                    {/* PC Sidebar */}
                    <div className="hidden md:block w-1/3 min-w-[300px] h-full bg-slate-800/50 rounded-lg border border-white/10 overflow-hidden">
                        <TreeView onSelectChuong={handleSelectChuong} />
                    </div>

                    {/* Mobile Drawer Sidebar */}
                    <Drawer
                        title="Danh mục Pháp điển"
                        placement="left"
                        onClose={() => setMobileDrawerVisible(false)}
                        open={mobileDrawerVisible}
                        width="85%"
                        styles={{ body: { padding: 0 } }}
                    >
                        <div className="h-full bg-slate-50">
                            <TreeView onSelectChuong={handleSelectChuong} />
                        </div>
                    </Drawer>

                    {/* Content Area */}
                    <div className="flex-1 w-full md:w-auto h-full bg-slate-800/50 rounded-lg border border-white/10 overflow-hidden p-2 md:p-4">
                        <ChuongReader chuong={selectedChuong} dieus={selectedDieus} />
                    </div>
                </div>
            </div>
        </SimpleLayout>
    );
};

export default PhapDienPage;
