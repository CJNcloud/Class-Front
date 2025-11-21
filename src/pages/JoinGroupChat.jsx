import { useState } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders, getAuthHeadersWithUserId, getUserInfo } from '../utils/userStorage';
import './JoinGroupChat.css';

const JoinGroupChat = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('input'); // 'input' or 'confirm'
  const [groupId, setGroupId] = useState('');
  const [groupInfo, setGroupInfo] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 获取完整的头像URL
  const getFullAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) {
      return null;
    }
    
    if (avatarUrl.startsWith('/')) {
      return `http://127.0.0.1:8000${avatarUrl}`;
    }
    
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    
    return `http://127.0.0.1:8000/${avatarUrl}`;
  };

  // 获取群聊头像样式类
  const getGroupAvatarClass = (groupId) => {
    const avatarClasses = ['group-avatar-teal', 'group-avatar-purple', 'group-avatar-pink', 'group-avatar-yellow', 'group-avatar-red'];
    const index = groupId % avatarClasses.length;
    return avatarClasses[index] || 'group-avatar-teal';
  };

  // 获取群聊信息
  const handleFetchGroupInfo = async () => {
    if (!groupId.trim()) {
      setError('请输入群聊ID');
      return;
    }

    const parsedId = parseInt(groupId.trim(), 10);
    if (isNaN(parsedId)) {
      setError('请输入有效的群聊ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/groups/${parsedId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('获取群聊信息成功:', data);
        setGroupInfo(data);
        setStep('confirm');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '获取群聊信息失败';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('请求错误:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 提交入群申请
  const handleSubmitJoinRequest = async () => {
    if (!groupInfo) {
      return;
    }

    if (!reason.trim()) {
      setError('请输入申请理由');
      return;
    }

    const userInfo = getUserInfo();
    const userId = userInfo?.id || userInfo?.userId;
    if (!userId) {
      setError('无法获取用户信息，请重新登录');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/groups/${groupInfo.id}/join-requests`, {
        method: 'POST',
        headers: getAuthHeadersWithUserId(),
        body: JSON.stringify({
          user_id: parseInt(userId, 10),
          reason: reason.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('提交入群申请成功:', data);
        alert('申请已提交，等待群主审核');
        navigate('/chat');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '提交申请失败';
        setError(errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      console.error('请求错误:', error);
      setError('网络错误，请稍后重试');
      alert('提交申请时发生错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 返回输入步骤
  const handleBack = () => {
    if (step === 'confirm') {
      setStep('input');
      setError('');
      setReason('');
    } else {
      navigate('/chat');
    }
  };

  // 获取群主头像样式
  const getOwnerAvatarClass = (ownerId) => {
    const avatarClasses = ['owner-avatar-teal', 'owner-avatar-purple', 'owner-avatar-pink', 'owner-avatar-yellow', 'owner-avatar-red'];
    const index = (ownerId || 0) % avatarClasses.length;
    return avatarClasses[index] || 'owner-avatar-teal';
  };

  return (
    <div className="join-group-container">
      {/* 顶部Header */}
      <div className="join-group-header">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="join-group-title">加入群聊</h1>
      </div>

      {step === 'input' && (
        <div className="join-group-content">
          <div className="input-section">
            <label className="input-label">群聊ID:</label>
            <input
              type="text"
              className="group-id-input"
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setError('');
              }}
              placeholder="请输入群聊ID"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleFetchGroupInfo();
                }
              }}
            />
            {error && <div className="error-message">{error}</div>}
            <button
              className="confirm-button"
              onClick={handleFetchGroupInfo}
              disabled={loading}
            >
              {loading ? '加载中...' : '确定'}
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && groupInfo && (
        <div className="join-group-content">
          <div className="group-info-section">
            <div className="info-row">
              <div className="info-item">
                <label className="info-label">群聊名称:</label>
                <div className="info-value">{groupInfo.name || '未命名群聊'}</div>
              </div>
              <div className="info-item">
                <label className="info-label">群头像:</label>
                <div className="avatar-container">
                  {groupInfo.avatar_url ? (
                    <>
                      <img
                        key={groupInfo.avatar_url}
                        src={getFullAvatarUrl(groupInfo.avatar_url)}
                        alt={groupInfo.name}
                        className="group-avatar-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('.group-avatar-fallback');
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                      />
                      <div
                        className={`group-avatar group-avatar-fallback ${getGroupAvatarClass(groupInfo.id)}`}
                        style={{ display: 'none' }}
                      >
                        <User size={40} />
                      </div>
                    </>
                  ) : (
                    <div className={`group-avatar ${getGroupAvatarClass(groupInfo.id)}`}>
                      <User size={40} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="info-row">
              <div className="info-item">
                <label className="info-label">群聊类型:</label>
                <div className="info-value">{groupInfo.group_type || '未设置'}</div>
              </div>
              <div className="info-item">
                <label className="info-label">群主:</label>
                <div className="owner-info">
                  <div className={`owner-avatar ${getOwnerAvatarClass(groupInfo.created_by_user_id)}`}>
                    <User size={16} />
                  </div>
                  <span className="owner-id">{groupInfo.created_by_user_id || '未知'}</span>
                </div>
              </div>
            </div>

            <div className="info-row">
              <div className="info-item full-width">
                <label className="info-label">群聊备注:</label>
                <div className="info-value">{groupInfo.note || '暂无备注'}</div>
              </div>
            </div>

            <div className="info-row">
              <div className="info-item full-width">
                <label className="info-label">群聊公告:</label>
                <div className="announcement-value">
                  {groupInfo.announce || '暂无公告'}
                </div>
              </div>
            </div>

            <div className="info-row">
              <div className="info-item full-width">
                <label className="info-label">申请理由:</label>
                <textarea
                  className="reason-input"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError('');
                  }}
                  placeholder="请输入申请理由"
                  rows={4}
                />
                {error && <div className="error-message">{error}</div>}
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="join-group-footer">
            <button className="cancel-button" onClick={handleBack}>
              取消
            </button>
            <button
              className="apply-button"
              onClick={handleSubmitJoinRequest}
              disabled={loading}
            >
              {loading ? '提交中...' : '申请加入'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinGroupChat;

