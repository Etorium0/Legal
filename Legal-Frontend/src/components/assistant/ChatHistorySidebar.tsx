import React, { useEffect, useState } from 'react';
import { Drawer, List, Button, Popconfirm, message, Spin, Empty } from 'antd';
import { DeleteOutlined, PlusOutlined, MessageOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { chatService, ChatSession } from '../../services/chatService';
import { authService } from '../../services/authService';

interface ChatHistorySidebarProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession?: (sessionId: string) => void;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  visible,
  onClose,
  onSelectSession
}) =>
{
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() =>
  {
    if (visible)
    {
      checkAuthAndLoadSessions();
    }
  }, [visible]);

  const checkAuthAndLoadSessions = async () =>
  {
    setLoading(true);
    try
    {
      // Check if user is authenticated
      const token = await authService.getValidAccessToken();
      if (!token)
      {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);

      // Load sessions
      const data = await chatService.getSessions();
      setSessions(data);
    }
    catch (error)
    {
      console.error('Failed to load sessions:', error);
      // Check if it's an auth error - token might be invalid/expired
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized')))
      {
        // Clear invalid token and show login prompt
        authService.logout();
        setIsAuthenticated(false);
      }
      else
      {
        message.error('Không thể tải lịch sử chat');
      }
    }
    finally
    {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) =>
  {
    try
    {
      await chatService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      message.success('Đã xóa cuộc trò chuyện');
    }
    catch (error)
    {
      console.error('Failed to delete session:', error);
      message.error('Không thể xóa cuộc trò chuyện');
    }
  };

  const handleNewChat = async () =>
  {
    // Check auth first
    const token = await authService.getValidAccessToken();
    if (!token)
    {
      message.warning('Vui lòng đăng nhập để tạo cuộc trò chuyện mới');
      navigate('/login');
      return;
    }

    try
    {
      await chatService.startNewChat();
      message.success('Đã bắt đầu cuộc trò chuyện mới');
      onClose();
      window.location.reload(); // Reload to start fresh
    }
    catch (error)
    {
      console.error('Failed to start new chat:', error);
      message.error('Không thể tạo cuộc trò chuyện mới');
    }
  };

  const handleLogin = () =>
  {
    onClose();
    navigate('/login');
  };

  const formatDate = (dateStr: string) => 
{
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {return 'Vừa xong';}
    if (diffMins < 60) {return `${diffMins} phút trước`;}
    if (diffHours < 24) {return `${diffHours} giờ trước`;}
    if (diffDays < 7) {return `${diffDays} ngày trước`;}
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <Drawer
      title="Lịch sử trò chuyện"
      placement="left"
      onClose={onClose}
      open={visible}
      width={320}
      styles={{
        body: { padding: '12px', background: '#1a1a2e' }
      }}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleNewChat}
          size="small"
        >
          Mới
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : isAuthenticated === false ? (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <LoginOutlined className="text-4xl text-gray-500 mb-4" />
          <p className="text-gray-400 text-center mb-4">
            Đăng nhập để xem và lưu lịch sử trò chuyện
          </p>
          <Button
            type="primary"
            icon={<LoginOutlined />}
            onClick={handleLogin}
          >
            Đăng nhập
          </Button>
        </div>
      ) : sessions.length === 0 ? (
        <Empty
          description={<span className="text-gray-400">Chưa có lịch sử trò chuyện</span>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={sessions}
          renderItem={(session) => (
            <List.Item
              className="bg-slate-800/50 rounded-lg mb-2 border border-white/10 hover:border-orange-400/50 transition-all cursor-pointer px-3 py-2"
              onClick={() => 
{
                if (onSelectSession) 
{
                  onSelectSession(session.id);
                  onClose();
                }
              }}
              actions={[
                <Popconfirm
                  title="Xóa cuộc trò chuyện này?"
                  onConfirm={(e) => 
{
                    e?.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={<MessageOutlined className="text-orange-400 text-lg" />}
                title={
                  <span className="text-white text-sm line-clamp-2">
                    {session.title || 'Cuộc trò chuyện'}
                  </span>
                }
                description={
                  <span className="text-gray-400 text-xs">
                    {formatDate(session.updated_at)}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};
