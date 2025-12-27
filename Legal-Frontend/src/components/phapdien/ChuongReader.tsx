import React, { useEffect, useState } from 'react';
import { Card, Empty, Typography, Divider } from 'antd';
import MarkdownIt from 'markdown-it';
import { Unit } from '../../services/lawService';

interface ChuongReaderProps {
    chuong: Unit | null;
    dieus: Unit[];
}

const md = new MarkdownIt({ html: true, breaks: true });

const ChuongReader: React.FC<ChuongReaderProps> = ({ chuong, dieus }) => 
{
    
    if (!chuong) 
{
        return (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
                <Empty description="Chọn một chương để xem nội dung" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-4 bg-white rounded-lg shadow">
            <Typography.Title level={3} className="text-center text-blue-800">
                {chuong.text}
            </Typography.Title>
            <Divider />
            
            <div className="space-y-6">
                {dieus.map((dieu) => (
                    <Card 
                        key={dieu.id} 
                        id={`dieu-${dieu.id}`}
                        className="shadow-sm hover:shadow-md transition-shadow"
                        title={<span className="font-bold text-lg">{dieu.code || `Điều ${dieu.order_index}`}</span>}
                    >
                        <div 
                            className="prose max-w-none text-gray-800"
                            dangerouslySetInnerHTML={{ __html: md.render(dieu.text || '') }}
                        />
                    </Card>
                ))}
                
                {dieus.length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                        (Chương này không có nội dung hoặc các điều chưa được cập nhật)
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChuongReader;
