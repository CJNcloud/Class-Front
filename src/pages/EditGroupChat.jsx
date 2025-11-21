import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, User } from 'lucide-react';
import { getAuthHeaders, getAuthHeadersWithUserId, getAuthHeadersForGroupOperation, clearUserInfo, getUserInfo } from '../utils/userStorage';
import './EditGroupChat.css';

const EditGroupChat = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    group_type: '',
    note: '',
    announce: '',
    created_by_user_id: '',
    announce_limit: 0,
    member_limit: 0,
    pin: '',
    audit_state: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [pinning, setPinning] = useState(false);

  // 获取完整的头像URL
  const getFullAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) {
      return null;
    }
    
    // 如果avatar_url是相对路径（以/开头），拼接完整URL
    if (avatarUrl.startsWith('/')) {
      return `http://127.0.0.1:8000${avatarUrl}`;
    }
    
    // 如果已经是完整URL，直接返回
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    
    // 其他情况也尝试拼接
    return `http://127.0.0.1:8000/${avatarUrl}`;
  };

  // 获取群聊信息
  useEffect(() => {
    const fetchGroupInfo = async () => {
      setFetchLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/groups/${groupId}`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('获取群聊信息成功:', data);
          
          // 设置表单数据
          setFormData({
            name: data.name || '',
            group_type: data.group_type || '',
            note: data.note || '',
            announce: data.announce || '',
            created_by_user_id: data.created_by_user_id || '',
            announce_limit: data.announce_limit || 0,
            member_limit: data.member_limit || 0,
            pin: data.pin || '',
            audit_state: data.audit_state || '',
          });
          
          // 设置置顶状态（根据pin字段判断：如果pin是"未置顶"则为false，否则为true）
          // pin字段可能是："未置顶"、"已置顶" 或其他值
          setIsPinned(data.pin && data.pin !== '未置顶');
          
          // 处理头像URL
          if (data.avatar_url) {
            const fullAvatarUrl = getFullAvatarUrl(data.avatar_url);
            console.log('头像URL（原始）:', data.avatar_url);
            console.log('头像URL（完整）:', fullAvatarUrl);
            setAvatarPreview(fullAvatarUrl);
            setAvatarError(false);
          } else {
            setAvatarPreview(null);
            setAvatarError(false);
          }
        } else {
          // 如果是401未授权，跳转到登录页
          if (response.status === 401) {
            console.error('未授权，请重新登录');
            navigate('/login');
            return;
          }
          
          const errorData = await response.json().catch(() => ({}));
          console.error('获取群聊信息失败:', errorData);
          alert('获取群聊信息失败，请稍后重试');
          navigate('/chat');
        }
      } catch (error) {
        console.error('获取群聊信息失败:', error);
        alert('获取群聊信息时发生错误，请稍后重试');
        navigate('/chat');
      } finally {
        setFetchLoading(false);
      }
    };

    if (groupId) {
      fetchGroupInfo();
    }
  }, [groupId, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarError(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.onerror = () => {
        setAvatarError(true);
        setAvatarPreview(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let avatarUrl = null;

      // 如果有新上传的头像文件，先上传文件获取URL
      if (avatarFile) {
        const fileFormData = new FormData();
        fileFormData.append('file', avatarFile);

        const uploadResponse = await fetch('http://127.0.0.1:8000/api/files/upload', {
          method: 'POST',
          body: fileFormData,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json().catch(() => ({}));
          const errorMessage = uploadError.message || uploadError.detail || uploadError.error || '上传头像失败，请稍后重试';
          alert(errorMessage);
          setLoading(false);
          return;
        }

        const uploadData = await uploadResponse.json();
        avatarUrl = uploadData.url;
        console.log('头像上传成功，URL:', avatarUrl);
      }

      // 构建修改请求数据
      const updateData = {
        name: formData.name.trim(),
        group_type: formData.group_type.trim(),
        note: formData.note.trim() || '',
        announce: formData.announce.trim() || '',
      };

      // 如果有新上传的头像URL，添加到请求数据中
      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      // 调用提交修改请求接口
      // POST /api/groups/{group_id}/update-requests
      // Header: X-User-Id（仅群主可以操作）
      // 使用 getAuthHeadersWithUserId() 自动添加 X-User-Id 和 Authorization 头
      const response = await fetch(`http://127.0.0.1:8000/api/groups/${groupId}/update-requests`, {
        method: 'POST',
        headers: getAuthHeadersWithUserId(), // 包含 X-User-Id 和 Authorization 头
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('修改请求已提交，等待审核');
        // 跳转回chat时携带groupId参数，以恢复之前选中的群聊
        navigate(`/chat?chatId=${groupId}`);
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '提交修改请求失败，请稍后重试';
        alert(errorMessage);
        console.error('提交修改请求失败:', errorData);
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存时发生错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!window.confirm('确定要解散群聊吗？此操作不可撤销！')) {
      return;
    }

    setDismissing(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: getAuthHeadersForGroupOperation(),
      });

      if (response.ok) {
        alert('群聊已解散');
        // 解散后跳转回chat，不携带chatId参数（因为群聊已被解散）
        navigate('/chat');
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '解散群聊失败，请稍后重试';
        alert(errorMessage);
        console.error('解散群聊失败:', errorData);
      }
    } catch (error) {
      console.error('解散群聊时发生错误:', error);
      alert('解散群聊时发生错误，请稍后重试');
    } finally {
      setDismissing(false);
    }
  };

  const handlePin = async () => {
    setPinning(true);
    try {
      // 切换置顶状态：如果当前已置顶，则取消置顶；如果未置顶，则置顶
      const newPinState = !isPinned;
      
      // 根据接口文档：
      // POST /api/groups/{group_id}/pin
      // Header: X-User-Id
      // 请求体: {"is_pinned": true} 或 {"is_pinned": false}
      const response = await fetch(`http://127.0.0.1:8000/api/groups/${groupId}/pin`, {
        method: 'POST',
        headers: getAuthHeadersWithUserId(),
        body: JSON.stringify({
          is_pinned: newPinState,
        }),
      });

      if (response.ok) {
        setIsPinned(newPinState);
        // 更新formData中的pin字段
        setFormData(prev => ({
          ...prev,
          pin: newPinState ? '已置顶' : '未置顶',
        }));
        alert(newPinState ? '群聊已置顶' : '已取消置顶');
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '置顶操作失败，请稍后重试';
        alert(errorMessage);
        console.error('置顶操作失败:', errorData);
      }
    } catch (error) {
      console.error('置顶操作时发生错误:', error);
      alert('置顶操作时发生错误，请稍后重试');
    } finally {
      setPinning(false);
    }
  };

  const handleCancel = () => {
    // 跳转回chat时携带groupId参数，以恢复之前选中的群聊
    navigate(`/chat?chatId=${groupId}`);
  };

  if (fetchLoading) {
    return (
      <div className="edit-group-container">
        <div className="edit-group-header">
          <button className="back-button" onClick={() => navigate('/chat')}>
            <ChevronLeft size={24} color="#1890ff" />
          </button>
          <h1 className="edit-group-title">群聊信息修改</h1>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="edit-group-container">
      {/* 头部 */}
      <div className="edit-group-header">
        <button className="back-button" onClick={() => navigate('/chat')}>
          <ChevronLeft size={24} color="#1890ff" />
        </button>
        <h1 className="edit-group-title">群聊信息修改</h1>
      </div>

      {/* 表单内容 */}
      <form className="edit-group-form" onSubmit={handleSubmit}>
        <div className="edit-group-content">
          {/* 左侧列 */}
          <div className="edit-group-left">
            <div className="form-group">
              <label className="form-label">群聊名称:</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="请输入群聊名称"
              />
            </div>

            <div className="form-group">
              <label className="form-label">群聊类型:</label>
              <input
                type="text"
                name="group_type"
                className="form-input"
                value={formData.group_type}
                onChange={handleInputChange}
                placeholder="请输入群聊类型"
              />
            </div>

            <div className="form-group">
              <label className="form-label">群聊备注:</label>
              <input
                type="text"
                name="note"
                className="form-input"
                value={formData.note}
                onChange={handleInputChange}
                placeholder="请输入群聊备注"
              />
            </div>

            <div className="form-group">
              <label className="form-label">群聊公告:</label>
              <input
                type="text"
                name="announce"
                className="form-input"
                value={formData.announce}
                onChange={handleInputChange}
                placeholder="请输入群聊公告"
              />
            </div>
          </div>

          {/* 右侧列 */}
          <div className="edit-group-right">
            <div className="form-group">
              <label className="form-label">群头像:</label>
              <div className="avatar-upload-area">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="avatar-upload" className="avatar-label">
                  {avatarPreview && !avatarError ? (
                    <img 
                      src={avatarPreview} 
                      alt="群头像" 
                      className="avatar-preview"
                      onError={() => {
                        setAvatarError(true);
                        setAvatarPreview(null);
                      }}
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      <div className="image-sky"></div>
                      <div className="image-cloud"></div>
                      <div className="image-hills"></div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">群主:</label>
              <input
                type="text"
                name="created_by_user_id"
                className="form-input"
                value={formData.created_by_user_id}
                onChange={handleInputChange}
                placeholder="群主ID"
                disabled
              />
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="edit-group-actions">
          <button
            type="button"
            className="action-button dismiss-button"
            onClick={handleDismiss}
            disabled={dismissing}
          >
            {dismissing ? '解散中...' : '解散群聊'}
          </button>
          <button
            type="button"
            className="action-button pin-button"
            onClick={handlePin}
            disabled={pinning}
          >
            {pinning ? '处理中...' : (isPinned ? '取消置顶' : '置顶群聊')}
          </button>
          <button
            type="button"
            className="action-button cancel-button"
            onClick={handleCancel}
          >
            取消
          </button>
          <button
            type="submit"
            className="action-button save-button"
            disabled={loading}
          >
            {loading ? '保存中...' : '保存修改'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditGroupChat;

