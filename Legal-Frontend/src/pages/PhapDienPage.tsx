import React, { useState } from 'react';
import { Layout, Typography } from 'antd';
import TreeView from '../components/phapdien/TreeView';
import ChuongReader from '../components/phapdien/ChuongReader';
import { Unit } from '../services/lawService';
import SimpleLayout from '../components/SimpleLayout';

const { Sider, Content } = Layout;
const { Title } = Typography;

const PhapDienPage: React.FC = () => 
{
    const [selectedChuong, setSelectedChuong] = useState<Unit | null>(null);
    const [selectedDieus, setSelectedDieus] = useState<Unit[]>([]);

    const handleSelectChuong = (chuong: Unit, dieus: Unit[]) => 
{
        setSelectedChuong(chuong);
        setSelectedDieus(dieus);
    };

    return (
        <SimpleLayout>
            <div className="h-[calc(100vh-64px)] flex flex-col">
                <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-white shadow-md">
                    <Title level={2} style={{ color: 'white', margin: 0 }}>
                        Bộ Pháp Điển Việt Nam
                    </Title>
                    <p className="mt-2 opacity-90">
                        Tra cứu hệ thống pháp luật được sắp xếp theo chủ đề, đề mục, chương, điều.
                    </p>
                </div>
                
                <div className="flex flex-1 overflow-hidden p-4 gap-4 bg-gray-100">
                    <div className="w-1/3 min-w-[300px] h-full">
                        <TreeView onSelectChuong={handleSelectChuong} />
                    </div>
                    <div className="flex-1 h-full">
                        <ChuongReader chuong={selectedChuong} dieus={selectedDieus} />
                    </div>
                </div>
            </div>
        </SimpleLayout>
    );
};

export default PhapDienPage;
