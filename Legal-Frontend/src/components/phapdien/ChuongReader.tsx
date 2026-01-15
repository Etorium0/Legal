import React from 'react';
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
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-6xl">📄</div>
                <p className="text-white/60 text-center">Chọn một chương để xem nội dung</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto custom-scrollbar p-4">
            <div className="space-y-6">
                {dieus.map((dieu) => (
                    <div
                        key={dieu.id}
                        id={`dieu-${dieu.id}`}
                        className="prose-legal"
                        dangerouslySetInnerHTML={{ __html: md.render(dieu.text || '') }}
                    />
                ))}

                {dieus.length === 0 && (
                    <div className="p-8 text-center text-white/60 bg-white/5 rounded-xl border border-white/10">
                        Chương này không có nội dung hoặc các điều chưa được cập nhật
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChuongReader;
