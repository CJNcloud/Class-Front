import { useState, useEffect } from 'react';
import { ArrowLeft, User, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserInfo } from '../utils/userStorage';
import './CreateGroupChat.css';

const CreateGroupChat = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    group_type: '',
    note: '',
    announce_limit: 0,
    announce: '',
    member_limit: 200,
  });
  const [creatorId, setCreatorId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // 初始化时设置创建人ID
  useEffect(() => {
    const userInfo = getUserInfo();
    const currentUserId = userInfo?.id || userInfo?.userId;
    if (currentUserId) {
      setCreatorId(Number(currentUserId));
    }
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCancel = () => {
    navigate('/chat');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      // 验证文件大小（例如：最大5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB');
        return;
      }
      setAvatarFile(file);
      // 创建预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    // 重置文件输入
    const fileInput = document.getElementById('avatar-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 表单验证
    if (!formData.name.trim()) {
      alert('请输入群聊名称');
      return;
    }
    if (!formData.group_type) {
      alert('请选择群聊类型');
      return;
    }
    if (!creatorId) {
      alert('无法获取用户ID，请重新登录');
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = null;

      // 如果有上传的头像文件，先上传文件获取URL
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
      }

      // 使用JSON格式创建群聊
      const groupData = {
        name: formData.name,
        group_type: formData.group_type,
        note: formData.note || '',
        announce_limit: formData.announce_limit || 0,
        announce: formData.announce || '',
        member_limit: formData.member_limit || 200,
        created_by_user_id: creatorId,
      };

      // 如果有头像URL，添加到请求数据中
      if (avatarUrl) {
        groupData.avatar_url = avatarUrl;
      }

      const response = await fetch('http://127.0.0.1:8000/api/groups/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('创建群聊成功:', data);
        // 显示成功信息（包含返回的数据）
        alert('创建群聊成功！');
        // 创建成功后返回聊天页面
        navigate('/chat');
      } else {
        console.error('创建群聊失败:', data);
        const errorMessage = data.message || data.detail || data.error || '创建群聊失败，请稍后重试';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('请求错误:', error);
      alert('创建群聊时发生错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-group-container">
      {/* 顶部Header */}
      <div className="create-group-header">
        <button className="back-button" onClick={() => navigate('/chat')}>
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="create-group-title">创建群聊</h1>
      </div>

      <div className="create-group-content">
        {/* 左侧表单区域 */}
        <div className="form-section">
          <div className="form-item">
            <label className="form-label">群聊名称:</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="请输入群聊名称"
            />
          </div>

          <div className="form-item">
            <label className="form-label">群聊类型:</label>
            <select
              className="form-input form-select"
              value={formData.group_type}
              onChange={(e) => handleInputChange('group_type', e.target.value)}
            >
              <option value="">请选择群聊类型</option>
              <option value="学习">学习</option>
              <option value="体育">体育</option>
            </select>
          </div>

          <div className="form-item">
            <label className="form-label">群聊备注:</label>
            <textarea
              className="form-input form-textarea"
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              placeholder="请输入群聊备注（可选）"
              rows={3}
            />
          </div>

          <div className="form-item">
            <label className="form-label">公告内容:</label>
            <textarea
              className="form-input form-textarea"
              value={formData.announce}
              onChange={(e) => handleInputChange('announce', e.target.value)}
              placeholder="请输入公告内容（可选）"
              rows={3}
            />
          </div>

          <div className="form-item">
            <label className="form-label">公告限制:</label>
            <input
              type="number"
              className="form-input"
              value={formData.announce_limit}
              onChange={(e) => handleInputChange('announce_limit', Number(e.target.value) || 0)}
              placeholder="公告限制（默认0）"
              min="0"
            />
          </div>

          <div className="form-item">
            <label className="form-label">成员上限:</label>
            <input
              type="number"
              className="form-input"
              value={formData.member_limit}
              onChange={(e) => handleInputChange('member_limit', Number(e.target.value) || 200)}
              placeholder="成员上限（默认200）"
              min="1"
            />
          </div>
        </div>

        {/* 右侧头像和时间区域 */}
        <div className="info-section">
          <div className="info-item">
            <label className="info-label">群头像:</label>
            <div className="avatar-upload-container">
              <div className="avatar-image">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="群头像预览" 
                    className="avatar-preview"
                  />
                ) : (
                  <div className="avatar-default">
                    <User size={80} color="#999" />
                  </div>
                )}
              </div>
              <div className="avatar-upload-actions">
                <label htmlFor="avatar-upload" className="upload-button">
                  <Upload size={16} />
                  上传头像
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                {avatarFile && (
                  <button
                    type="button"
                    className="remove-avatar-button"
                    onClick={handleRemoveAvatar}
                  >
                    移除
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="info-item">
            <label className="info-label">群聊创建时间:</label>
            <div className="time-display">
              {new Date().toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="create-group-footer">
        <button className="cancel-button" onClick={handleCancel}>
          取消
        </button>
        <button 
          className="create-button" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '创建中...' : '创建群聊'}
        </button>
      </div>
    </div>
  );
};

export default CreateGroupChat;

