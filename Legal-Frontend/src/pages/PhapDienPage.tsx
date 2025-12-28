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
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white shadow-md">
                    <Title level={2} style={{ color: 'white', margin: 0 }}>
                        Bộ Pháp Điển Việt Nam
                    </Title>
                    <p className="mt-2 opacity-90">
                        Tra cứu hệ thống pháp luật được sắp xếp theo chủ đề, đề mục, chương, điều.
                    </p>
                </div>
                
                <div className="flex flex-1 overflow-hidden p-4 gap-4 bg-slate-900/50">
                    <div className="w-1/3 min-w-[300px] h-full bg-slate-800/50 rounded-lg border border-white/10 overflow-hidden">
                        <TreeView onSelectChuong={handleSelectChuong} />
                    </div>
                    <div className="flex-1 h-full bg-slate-800/50 rounded-lg border border-white/10 overflow-hidden p-4">
                        <ChuongReader chuong={selectedChuong} dieus={selectedDieus} />
                    </div>
                </div>
            </div>
        </SimpleLayout>
    );
};

export default PhapDienPage;
