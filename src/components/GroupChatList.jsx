import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Info } from 'lucide-react';
import { getAuthHeadersWithUserId, getUserInfo } from '../utils/userStorage';
import './GroupChatList.css';

const GroupChatList = ({ selectedChatId, onChatSelect, onGroupChatsLoaded, userId }) => {
  const navigate = useNavigate();
  const [groupChats, setGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avatarErrors, setAvatarErrors] = useState(new Set());

  // 根据群聊ID生成头像样式
  const getGroupAvatarClass = (groupId) => {
    const avatarClasses = ['group-avatar-teal', 'group-avatar-purple', 'group-avatar-pink', 'group-avatar-yellow', 'group-avatar-red'];
    const index = groupId % avatarClasses.length;
    return avatarClasses[index] || 'group-avatar-teal';
  };

  // 获取群聊头像URL或使用默认样式
  const getGroupAvatarUrl = (chat) => {
    if (!chat.avatar_url) {
      return null;
    }
    
    // 如果avatar_url是相对路径（以/开头），拼接完整URL
    if (chat.avatar_url.startsWith('/')) {
      return `http://127.0.0.1:8000${chat.avatar_url}`;
    }
    
    // 如果已经是完整URL，直接返回
    if (chat.avatar_url.startsWith('http://') || chat.avatar_url.startsWith('https://')) {
      return chat.avatar_url;
    }
    
    // 其他情况也尝试拼接
    return `http://127.0.0.1:8000/${chat.avatar_url}`;
  };

  // 获取群聊列表
  useEffect(() => {
    const fetchGroupChats = async () => {
      setLoading(true);
      try {
        // 获取用户信息，确保有用户ID
        const userInfo = getUserInfo();
        if (!userInfo || (!userInfo.id && !userInfo.userId)) {
          console.error('无法获取用户信息');
          setGroupChats([]);
          setLoading(false);
          return;
        }

        const response = await fetch('http://127.0.0.1:8000/api/groups/my', {
          method: 'GET',
          headers: getAuthHeadersWithUserId(),
        });

        if (response.ok) {
          const data = await response.json();
          // API 返回的是群聊数组，已按置顶状态和创建时间排序
          const groupsList = Array.isArray(data) ? data : [];
          console.log('获取群聊列表成功:', groupsList);
          setGroupChats(groupsList);
          
          // 通过回调函数将群聊列表传递给父组件
          if (onGroupChatsLoaded) {
            onGroupChatsLoaded(groupsList);
          }
        } else {
          // 如果是401未授权，可能需要重新登录
          if (response.status === 401) {
            console.error('未授权，请重新登录');
          }
          const errorData = await response.json().catch(() => ({}));
          console.error('获取群聊列表失败:', errorData);
          setGroupChats([]);
        }
      } catch (error) {
        console.error('获取群聊列表失败:', error);
        setGroupChats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="group-chat-list">
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>加载中...</div>
      </div>
    );
  }

  if (groupChats.length === 0) {
    return (
      <div className="group-chat-list">
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>暂无群聊</div>
      </div>
    );
  }

  return (
    <div className="group-chat-list">
      {groupChats.map((chat) => {
        const avatarUrl = getGroupAvatarUrl(chat);
        const hasAvatarError = avatarErrors.has(chat.id);
        const showAvatar = avatarUrl && !hasAvatarError;
        const avatarClass = getGroupAvatarClass(chat.id);
        // 判断是否置顶：pin字段不是"未置顶"则表示已置顶
        const isPinned = chat.pin && chat.pin !== '未置顶';

        return (
          <div
            key={chat.id}
            className={`group-chat-item ${selectedChatId === chat.id ? 'selected' : ''} ${isPinned ? 'pinned' : ''}`}
            onClick={() => onChatSelect(chat.id)}
          >
            {showAvatar ? (
              <img 
                src={avatarUrl} 
                alt={chat.name}
                className="group-avatar-img"
                onError={() => {
                  setAvatarErrors(prev => new Set([...prev, chat.id]));
                }}
              />
            ) : (
              <div className={`group-avatar ${avatarClass}`}>
                <User size={20} />
              </div>
            )}
            <div className="group-chat-info">
              <div className="group-chat-name">
                <span>{chat.name || '未命名群聊'}</span>
                {chat.approved_report_count !== undefined && chat.approved_report_count > 0 && (
                  <span className="violation-badge" title={`违规次数: ${chat.approved_report_count}次`}>
                    {chat.approved_report_count}次违规
                  </span>
                )}
              </div>
              <div className="group-chat-preview">
                {chat.announce || chat.note || '暂无公告'}
              </div>
            </div>
            <button
              className="group-info-button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/group-members/${chat.id}`);
              }}
              title="群聊信息"
            >
              <Info size={18} color="#1890ff" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default GroupChatList;

