import React, { useState } from 'react';
import { Send, Sparkles, TrendingUp, Clock, FileText, Zap, Bot, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { ResultCard } from './ResultCard';

export function DashboardPage() {
  const [question, setQuestion] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleAsk = () => {
    if (question.trim()) {
      setShowResults(true);
    }
  };

  const recentQuestions = [
    { q: 'Thủ tục thành lập doanh nghiệp tư nhân là gì?', icon: '🏢' },
    { q: 'Quyền lợi của người lao động khi bị sa thải trái luật', icon: '👨‍💼' },
    { q: 'Điều kiện để được cấp giấy phép lái xe ô tô', icon: '🚗' }
  ];

  const quickTopics = [
    { icon: '📜', label: 'Luật Dân sự', color: 'from-blue-500 to-cyan-500' },
    { icon: '⚖️', label: 'Luật Hình sự', color: 'from-purple-500 to-pink-500' },
    { icon: '💼', label: 'Luật Lao động', color: 'from-green-500 to-emerald-500' },
    { icon: '🏢', label: 'Luật Doanh nghiệp', color: 'from-amber-500 to-orange-500' }
  ];

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50 overflow-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Welcome Section */}
        {!showResults && (
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl mb-6 shadow-2xl shadow-blue-500/30 animate-float">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="mb-3 bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
              Xin chào! Tôi có thể giúp gì cho bạn?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Đặt câu hỏi pháp lý bằng ngôn ngữ tự nhiên, tôi sẽ tìm kiếm và trả lời dựa trên cơ sở pháp luật Việt Nam
            </p>
          </div>
        )}

        {/* Question Input */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 mb-8 animate-scale-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <label className="block mb-4 text-slate-700">Câu hỏi của bạn</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ví dụ: Thủ tục ly hôn theo pháp luật Việt Nam như thế nào?"
              className="w-full min-h-[140px] px-5 py-4 border-2 border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-700 placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
            />
            <div className="flex items-center justify-between mt-5">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Zap className="w-4 h-4" />
                <span>Nhấn Enter để gửi, Shift + Enter để xuống dòng</span>
              </div>
              <Button 
                variant="primary" 
                size="lg" 
                icon={<Send className="w-5 h-5" />}
                onClick={handleAsk}
                disabled={!question.trim()}
                className="shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
              >
                Hỏi Luật sư ảo
              </Button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {showResults ? (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-900">Kết quả tìm kiếm</h3>
              <button 
                onClick={() => {
                  setShowResults(false);
                  setQuestion('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50"
              >
                + Đặt câu hỏi mới
              </button>
            </div>

            {/* AI Answer */}
            <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 border-2 border-blue-200 shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-slate-900">Câu trả lời từ AI</h4>
                      <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        <CheckCircle className="w-3 h-3" />
                        <span>Độ tin cậy cao</span>
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed mb-4">
                      Theo quy định tại <strong className="text-blue-700">Điều 51 Bộ luật Hôn nhân và Gia đình 2014</strong>, 
                      thủ tục ly hôn tại Tòa án bao gồm các bước sau:
                    </p>
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 space-y-3 border border-white/50">
                      {[
                        'Nộp đơn khởi kiện ly hôn kèm các giấy tờ liên quan',
                        'Tòa án tiến hành hòa giải',
                        'Nếu hòa giải không thành, tiến hành xét xử',
                        'Tòa án ra quyết định công nhận ly hôn'
                      ].map((step, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-slate-700 pt-0.5">{step}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-slate-600">
                      ⏱️ Thời gian giải quyết thông thường từ <strong>1-3 tháng</strong> tùy theo độ phức tạp của vụ việc.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-5 border-t border-blue-200">
                  <div className="px-4 py-2 bg-white rounded-xl text-sm flex items-center gap-2 shadow-sm">
                    <span className="text-slate-500">Độ tin cậy:</span>
                    <span className="text-green-600">95%</span>
                  </div>
                  <div className="px-4 py-2 bg-white rounded-xl text-sm flex items-center gap-2 shadow-sm">
                    <span className="text-slate-500">Nguồn:</span>
                    <span className="text-slate-900">3 văn bản</span>
                  </div>
                  <div className="px-4 py-2 bg-white rounded-xl text-sm flex items-center gap-2 shadow-sm">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-slate-900">2.3s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Documents */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-slate-600" />
                <h4 className="text-slate-900">Văn bản pháp luật liên quan</h4>
              </div>
              <div className="space-y-4">
                <ResultCard
                  title="Bộ luật Hôn nhân và Gia đình 2014 - Điều 51"
                  excerpt="Người có quyền yêu cầu ly hôn: Vợ, chồng có quyền yêu cầu ly hôn. Trong trường hợp một bên bị hạn chế năng lực hành vi dân sự thì người đại diện theo pháp luật của họ có quyền yêu cầu ly hôn..."
                  source="Quốc hội"
                  date="19/06/2014"
                  relevanceScore={0.95}
                  tags={['Hôn nhân', 'Ly hôn', 'Quyền và nghĩa vụ']}
                />
                <ResultCard
                  title="Nghị quyết 02/2016/NQ-HĐTP - Hướng dẫn áp dụng luật ly hôn"
                  excerpt="Hội đồng Thẩm phán Tòa án nhân dân tối cao ban hành hướng dẫn về thủ tục, quyền và nghĩa vụ của các bên trong vụ án ly hôn, bao gồm việc phân chia tài sản và quyền nuôi con..."
                  source="TANDTC"
                  date="25/01/2016"
                  relevanceScore={0.88}
                  tags={['Thủ tục tố tụng', 'Hướng dẫn', 'Ly hôn']}
                />
                <ResultCard
                  title="Thông tư 01/2020/TT-BTP - Mẫu văn bản ly hôn"
                  excerpt="Quy định mẫu đơn khởi kiện ly hôn, giấy tờ cần thiết, quy trình nộp hồ sơ tại Tòa án và các biểu mẫu liên quan đến thủ tục ly hôn theo quy định mới nhất..."
                  source="Bộ Tư pháp"
                  date="15/03/2020"
                  relevanceScore={0.82}
                  tags={['Biểu mẫu', 'Thủ tục', 'Hành chính']}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Recent Questions */}
            <div className="mb-8 animate-slide-in">
              <div className="flex items-center gap-3 mb-5">
                <Clock className="w-5 h-5 text-slate-500" />
                <h5 className="text-slate-700">Câu hỏi gần đây</h5>
              </div>
              <div className="grid gap-3">
                {recentQuestions.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuestion(item.q);
                      setShowResults(true);
                    }}
                    className="group text-left px-6 py-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all flex items-center gap-4"
                  >
                    <div className="text-2xl">{item.icon}</div>
                    <p className="flex-1 text-slate-700 group-hover:text-blue-700 transition-colors">{item.q}</p>
                    <Sparkles className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Topics */}
            <div className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-3 mb-5">
                <TrendingUp className="w-5 h-5 text-slate-500" />
                <h5 className="text-slate-700">Chủ đề phổ biến</h5>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickTopics.map((topic, index) => (
                  <button
                    key={index}
                    className="group relative p-6 bg-white rounded-2xl hover:shadow-2xl transition-all overflow-hidden border border-slate-200 hover:border-transparent"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${topic.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <div className="relative">
                      <div className="text-3xl mb-3">{topic.icon}</div>
                      <p className="text-slate-700 group-hover:text-slate-900 transition-colors">{topic.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
