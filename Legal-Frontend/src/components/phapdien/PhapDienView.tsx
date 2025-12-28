import React, { useState } from 'react';
import { Typography } from 'antd';
import TreeView from './TreeView';
import ChuongReader from './ChuongReader';
import { Unit } from '../../services/lawService';

const { Title } = Typography;

const PhapDienView: React.FC = () => 
{
    const [selectedChuong, setSelectedChuong] = useState<Unit | null>(null);
    const [selectedDieus, setSelectedDieus] = useState<Unit[]>([]);

    const handleSelectChuong = (chuong: Unit, dieus: Unit[]) => 
    {
        setSelectedChuong(chuong);
        setSelectedDieus(dieus);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
             <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
                <h2 className="text-2xl font-bold text-white">Bộ Pháp Điển Việt Nam</h2>
                <p className="mt-2 text-white/70">
                    Tra cứu hệ thống pháp luật được sắp xếp theo chủ đề, đề mục, chương, điều.
                </p>
            </div>
            
            <div className="flex flex-1 overflow-hidden gap-4">
                <div className="w-1/3 min-w-[300px] h-full bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                    <TreeView onSelectChuong={handleSelectChuong} />
                </div>
                <div className="flex-1 h-full bg-white/5 rounded-lg border border-white/10 overflow-hidden p-4">
                    <ChuongReader chuong={selectedChuong} dieus={selectedDieus} />
                </div>
            </div>
        </div>
    );
};

export default PhapDienView;
