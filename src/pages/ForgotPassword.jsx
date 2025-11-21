import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: '', // 用户名/手机号/邮箱
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.identifier) {
      newErrors.identifier = '请输入用户名、手机号或邮箱';
    } else {
      // 验证是邮箱格式或手机号格式或用户名
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.identifier);
      const isPhone = /^1[3-9]\d{9}$/.test(formData.identifier);
      if (!isEmail && !isPhone && formData.identifier.length < 2) {
        newErrors.identifier = '请输入正确的用户名、手机号或邮箱格式';
      }
    }

    if (!formData.newPassword) {
      newErrors.newPassword = '请输入新密码';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = '密码至少6个字符';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/users/reset-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: formData.identifier,
          new_password: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('密码重置成功:', data);
        alert('密码重置成功！请使用新密码登录。');
        navigate('/login');
      } else {
        console.error('密码重置失败:', data);
        const errorMessage = data.message || data.detail || data.error || '密码重置失败，请稍后重试';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('请求错误:', error);
      alert('密码重置时发生错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      {/* 顶部Header */}
      <div className="forgot-password-header">
        <button className="back-button" onClick={() => navigate('/login')}>
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="forgot-password-title">找回密码</h1>
      </div>

      {/* 表单区域 */}
      <div className="forgot-password-content">
        <div className="forgot-password-form-wrapper">
          <form className="forgot-password-form" onSubmit={handleSubmit}>
            <div className="form-item">
              <label className="form-label">用户名/手机号/邮箱</label>
              <input
                type="text"
                className={`form-input ${errors.identifier ? 'error' : ''}`}
                value={formData.identifier}
                onChange={(e) => handleInputChange('identifier', e.target.value)}
                placeholder="请输入用户名、手机号或邮箱"
              />
              {errors.identifier && (
                <span className="error-message">{errors.identifier}</span>
              )}
            </div>

            <div className="form-item">
              <label className="form-label">新密码</label>
              <input
                type="password"
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                placeholder="请输入新密码（至少6个字符）"
              />
              {errors.newPassword && (
                <span className="error-message">{errors.newPassword}</span>
              )}
            </div>

            <div className="form-item">
              <label className="form-label">确认密码</label>
              <input
                type="password"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="请再次输入新密码"
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="form-actions">
              <button 
                type="button"
                className="cancel-button"
                onClick={() => navigate('/login')}
              >
                取消
              </button>
              <button 
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading ? '提交中...' : '确定'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

