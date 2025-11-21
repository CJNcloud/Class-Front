import { useState, useEffect, useCallback } from 'react';
import { Settings, User, LogOut, X, Trash2, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserInfo, clearUserInfo, saveUserInfo, getAuthHeadersWithUserId } from '../utils/userStorage';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('account');
  const [deactivating, setDeactivating] = useState(false);
  const [editingFields, setEditingFields] = useState(new Set()); // 可以同时编辑多个字段
  const [editValues, setEditValues] = useState({
    phone: '',
    email: '',
    password: '',
  });
  const [updating, setUpdating] = useState(false);
  const [userInfo, setUserInfo] = useState({
    username: '用户001',
    name: '张三',
    birthDate: '08/09/1997',
    userId: '127832',
    gender: '男',
    phone: '31823911',
    education: '本科',
    school: '南京航空航天大学',
    email: '217389@qq.com',
  });
  // 举报记录相关状态
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportState, setReportState] = useState(''); // 筛选状态：空字符串表示全部
  const [reportCurrentPage, setReportCurrentPage] = useState(1);
  const [reportTotalPages, setReportTotalPages] = useState(1);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const reportsPerPage = 10;

  useEffect(() => {
    // 从 localStorage 获取用户信息
    const storedUserInfo = getUserInfo();
    if (storedUserInfo) {
      const userId = storedUserInfo.id || storedUserInfo.userId;
      if (userId) {
        // 调用 API 获取用户详细信息
        fetchUserProfile(userId);
      } else {
        // 如果没有用户ID，使用 localStorage 中的数据
        setUserInfo(prev => ({
          ...prev,
          username: storedUserInfo.username || prev.username,
          email: storedUserInfo.email || prev.email,
          name: storedUserInfo.name || storedUserInfo.email || prev.name,
          userId: storedUserInfo.userId || storedUserInfo.id || prev.userId,
          id: storedUserInfo.id || storedUserInfo.userId || prev.userId,
          ...storedUserInfo,
        }));
      }
    }
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('获取用户信息成功:', data);
        // 使用 API 返回的数据更新用户信息
        setUserInfo(prev => ({
          ...prev,
          id: data.id,
          userId: data.id,
          username: data.username || prev.username,
          phone: data.phone || prev.phone,
          email: data.email || prev.email,
          name: data.email || prev.name, // 姓名使用邮箱
          created_at: data.created_at || prev.created_at,
          role: data.role || prev.role,
        }));
        // 更新 localStorage
        const storedUserInfo = getUserInfo();
        if (storedUserInfo) {
          const updatedUserInfo = {
            ...storedUserInfo,
            id: data.id,
            userId: data.id,
            username: data.username,
            phone: data.phone,
            email: data.email,
            created_at: data.created_at,
            role: data.role,
          };
          saveUserInfo(updatedUserInfo);
        }
      } else {
        console.error('获取用户信息失败:', data);
        // 如果 API 失败，使用 localStorage 中的数据
        const storedUserInfo = getUserInfo();
        if (storedUserInfo) {
          setUserInfo(prev => ({
            ...prev,
            username: storedUserInfo.username || prev.username,
            email: storedUserInfo.email || prev.email,
            name: storedUserInfo.name || storedUserInfo.email || prev.name,
            userId: storedUserInfo.userId || storedUserInfo.id || prev.userId,
            id: storedUserInfo.id || storedUserInfo.userId || prev.userId,
            ...storedUserInfo,
          }));
        }
      }
    } catch (error) {
      console.error('请求用户信息错误:', error);
      // 如果请求失败，使用 localStorage 中的数据
      const storedUserInfo = getUserInfo();
      if (storedUserInfo) {
        setUserInfo(prev => ({
          ...prev,
          username: storedUserInfo.username || prev.username,
          email: storedUserInfo.email || prev.email,
          name: storedUserInfo.name || storedUserInfo.email || prev.name,
          userId: storedUserInfo.userId || storedUserInfo.id || prev.userId,
          id: storedUserInfo.id || storedUserInfo.userId || prev.userId,
          ...storedUserInfo,
        }));
      }
    }
  };

  const handleLogout = () => {
    // 处理退出登录逻辑
    console.log('退出登录');
    clearUserInfo();
    navigate('/login');
  };

  const handleDeactivate = async () => {
    // 确认是否要注销账号
    const confirmed = window.confirm('确定要注销账号吗？此操作不可恢复！');
    if (!confirmed) {
      return;
    }

    setDeactivating(true);
    
    try {
      // 获取用户ID
      const userId = userInfo.id || userInfo.userId;
      if (!userId) {
        console.error('无法获取用户ID');
        alert('无法获取用户ID，请重新登录');
        clearUserInfo();
        navigate('/');
        return;
      }

      // 发送 DELETE 请求
      const response = await fetch(`http://127.0.0.1:8000/api/users/${userId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('注销账号成功');
        // 清除用户信息
        clearUserInfo();
        // 跳转到登录页面
        navigate('/');
      } else {
        const data = await response.json();
        console.error('注销账号失败:', data);
        alert('注销账号失败，请稍后重试');
      }
    } catch (error) {
      console.error('请求错误:', error);
      alert('注销账号时发生错误，请稍后重试');
    } finally {
      setDeactivating(false);
    }
  };

  const handleEditField = (field) => {
    const newEditingFields = new Set(editingFields);
    if (newEditingFields.has(field)) {
      // 如果已经在编辑，则取消编辑
      newEditingFields.delete(field);
      setEditValues(prev => ({
        ...prev,
        [field]: '',
      }));
    } else {
      // 添加编辑字段
      newEditingFields.add(field);
      setEditValues(prev => ({
        ...prev,
        [field]: userInfo[field] || '',
      }));
    }
    setEditingFields(newEditingFields);
  };

  const handleCancelAllEdit = () => {
    setEditingFields(new Set());
    setEditValues({
      phone: '',
      email: '',
      password: '',
    });
  };

  // 获取举报记录列表的函数
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const currentUser = getUserInfo();
      const userId = currentUser?.id || currentUser?.userId;
      if (!userId) {
        console.error('无法获取用户ID');
        setReportsLoading(false);
        return;
      }

      const skip = (reportCurrentPage - 1) * reportsPerPage;
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: reportsPerPage.toString(),
      });
      
      if (reportState) {
        params.append('state', reportState);
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/reports/my?${params.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeadersWithUserId(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('获取举报记录成功:', data);
        
        // 假设API返回格式为数组或 { items: [], total: 0 }
        if (Array.isArray(data)) {
          setReports(data);
          // 如果返回的数据量等于reportsPerPage，可能还有更多页面
          if (data.length === reportsPerPage) {
            setReportTotalPages(reportCurrentPage + 1);
          } else {
            setReportTotalPages(Math.max(1, reportCurrentPage));
          }
        } else if (data.items) {
          setReports(data.items || []);
          const total = data.total || data.items?.length || 0;
          setReportTotalPages(Math.max(1, Math.ceil(total / reportsPerPage)));
        } else {
          setReports([]);
          setReportTotalPages(1);
        }
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('获取举报记录失败:', errorData);
        setReports([]);
        setReportTotalPages(1);
      }
    } catch (error) {
      console.error('获取举报记录失败:', error);
      setReports([]);
      setReportTotalPages(1);
    } finally {
      setReportsLoading(false);
    }
  }, [reportCurrentPage, reportState, navigate]);

  // 当切换到举报记录标签或状态/页码变化时，获取举报记录
  useEffect(() => {
    if (activeNav === 'report-history') {
      fetchReports();
    }
  }, [activeNav, fetchReports]);

  // 删除举报
  const handleDeleteReport = async (reportId) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    // 检查是否已处理（审核状态不是"待审核"等未处理状态）
    const processedStates = ['已通过', '已拒绝', '已处理'];
    if (processedStates.includes(report.audit_state)) {
      alert('已处理的举报不能删除');
      return;
    }

    if (!window.confirm('确定要删除这条举报记录吗？')) {
      return;
    }

    setDeletingReportId(reportId);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/reports/${reportId}`,
        {
          method: 'DELETE',
          headers: getAuthHeadersWithUserId(),
        }
      );

      if (response.ok) {
        alert('删除成功');
        // 刷新列表
        fetchReports();
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '删除失败，请稍后重试';
        alert(errorMessage);
        console.error('删除举报失败:', errorData);
      }
    } catch (error) {
      console.error('删除举报时发生错误:', error);
      alert('删除举报时发生错误，请稍后重试');
    } finally {
      setDeletingReportId(null);
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '未知';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  };

  // 获取审核状态显示
  const getAuditStateDisplay = (state) => {
    const stateMap = {
      '未审核': { text: '未审核', color: '#faad14' },
      '已通过': { text: '已通过', color: '#52c41a' },
      '已拒绝': { text: '已拒绝', color: '#ff4d4f' },
      '已处理': { text: '已处理', color: '#1890ff' },
    };
    return stateMap[state] || { text: state || '未知', color: '#999999' };
  };

  // 判断是否可以删除
  const canDeleteReport = (report) => {
    const processedStates = ['已通过', '已拒绝', '已处理'];
    return !processedStates.includes(report.audit_state);
  };

  const handleUpdateFields = async () => {
    if (editingFields.size === 0) return;

    setUpdating(true);
    try {
      const userId = userInfo.id || userInfo.userId;
      if (!userId) {
        alert('无法获取用户ID，请重新登录');
        setUpdating(false);
        return;
      }

      // 构建更新数据，包含所有正在编辑的字段
      const updateData = {};
      const errors = [];

      if (editingFields.has('phone')) {
        if (!editValues.phone) {
          errors.push('请输入手机号');
        } else {
          // 验证手机号格式
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (!phoneRegex.test(editValues.phone)) {
            errors.push('请输入正确的手机号格式');
          } else {
            updateData.phone = editValues.phone;
          }
        }
      }

      if (editingFields.has('email')) {
        if (!editValues.email) {
          errors.push('请输入电子邮箱');
        } else {
          // 验证邮箱格式
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(editValues.email)) {
            errors.push('请输入正确的邮箱格式');
          } else {
            updateData.email = editValues.email;
          }
        }
      }

      if (editingFields.has('password')) {
        if (!editValues.password) {
          errors.push('请输入新密码');
        } else if (editValues.password.length < 6) {
          errors.push('密码至少6个字符');
        } else {
          updateData.password = editValues.password;
        }
      }

      if (errors.length > 0) {
        alert(errors.join('\n'));
        setUpdating(false);
        return;
      }

      if (Object.keys(updateData).length === 0) {
        alert('没有需要更新的字段');
        setUpdating(false);
        return;
      }

      const response = await fetch(`http://127.0.0.1:8000/api/users/${userId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('更新成功:', data);
        // 更新本地用户信息，更新所有编辑的字段
        const updatedUserInfo = { ...userInfo };
        editingFields.forEach(field => {
          if (editValues[field]) {
            updatedUserInfo[field] = editValues[field];
          }
        });
        setUserInfo(prev => ({
          ...prev,
          ...updatedUserInfo,
          ...data, // 如果有返回的用户信息，也更新
        }));
        // 更新 localStorage
        const storedUserInfo = getUserInfo();
        if (storedUserInfo) {
          const updatedStoredInfo = {
            ...storedUserInfo,
            ...updatedUserInfo,
            ...data,
          };
          saveUserInfo(updatedStoredInfo);
        }
        // 退出所有编辑状态
        handleCancelAllEdit();
        alert('更新成功');
      } else {
        console.error('更新失败:', data);
        const errorMessage = data.message || data.detail || data.error || '更新失败，请稍后重试';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('请求错误:', error);
      alert('更新时发生错误，请稍后重试');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="profile-container">
      {/* 顶部Header */}
      <div className="profile-header">
        <div className="header-left">
          <Settings size={20} color="#1890ff" />
          <span className="header-text">系统</span>
        </div>
        <h1 className="profile-title">我的个人资料</h1>
        <div className="header-right" onClick={() => navigate('/chat')}>
          <div className="user-avatar user-avatar-pink">
            <User size={20} />
          </div>
          <span className="user-name">{userInfo?.username || '用户001'}</span>
        </div>
      </div>

      <div className="profile-content-wrapper">
        {/* 左侧导航栏 */}
        <div className="profile-sidebar">
          <div
            className={`nav-item ${activeNav === 'account' ? 'active' : ''}`}
            onClick={() => setActiveNav('account')}
          >
            账号管理
          </div>
          <div
            className={`nav-item ${activeNav === 'report-history' ? 'active' : ''}`}
            onClick={() => setActiveNav('report-history')}
          >
            举报记录
          </div>
        </div>

        {/* 中央内容区域 */}
        <div className="profile-main">
          {activeNav === 'account' && (
            <div className="profile-section">
              <h2 className="section-title">个人信息</h2>
              <div className="info-grid">
                <div className="info-column">
                  <div className="info-item">
                    <span className="info-label">用户名</span>
                    <span className="info-value">{userInfo.username}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">姓名</span>
                    <span className="info-value">{userInfo.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">出生日期</span>
                    <span className="info-value">{userInfo.birthDate}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">用户ID</span>
                    <span className="info-value">{userInfo.userId}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">性别</span>
                    <span className="info-value">{userInfo.gender}</span>
                  </div>
                </div>
                <div className="info-column">
                  <div className="info-item">
                    <span className="info-label">手机号</span>
                    {editingFields.has('phone') ? (
                      <div className="edit-field-container">
                        <input
                          type="text"
                          className="edit-input"
                          value={editValues.phone}
                          onChange={(e) => setEditValues(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="请输入手机号"
                        />
                      </div>
                    ) : (
                      <span className="info-value">{userInfo.phone}</span>
                    )}
                  </div>
                  <div className="info-item">
                    <span className="info-label">学历</span>
                    <span className="info-value">{userInfo.education}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">学校/工作单位</span>
                    <span className="info-value">{userInfo.school}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">个人电子邮箱</span>
                    {editingFields.has('email') ? (
                      <div className="edit-field-container">
                        <input
                          type="email"
                          className="edit-input"
                          value={editValues.email}
                          onChange={(e) => setEditValues(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="请输入电子邮箱"
                        />
                      </div>
                    ) : (
                      <span className="info-value">{userInfo.email}</span>
                    )}
                  </div>
                  {editingFields.has('password') && (
                    <div className="info-item">
                      <span className="info-label">新密码</span>
                      <div className="edit-field-container">
                        <input
                          type="password"
                          className="edit-input"
                          value={editValues.password}
                          onChange={(e) => setEditValues(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="请输入新密码"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="profile-actions">
                <button className="action-button logout-button" onClick={handleLogout}>
                  <LogOut size={16} />
                  退出登录
                </button>
                <button 
                  className="action-button deactivate-button" 
                  onClick={handleDeactivate}
                  disabled={deactivating}
                >
                  <X size={16} />
                  {deactivating ? '注销中...' : '注销账号'}
                </button>
              </div>
            </div>
          )}

          {activeNav === 'report-history' && (
            <div className="profile-section">
              <h2 className="section-title">举报记录</h2>
              
              {/* 状态筛选 */}
              <div className="report-filters">
                <div className="filter-group">
                  <label className="filter-label">审核状态：</label>
                  <select
                    className="filter-select"
                    value={reportState}
                    onChange={(e) => {
                      setReportState(e.target.value);
                      setReportCurrentPage(1); // 重置到第一页
                    }}
                  >
                    <option value="">全部</option>
                    <option value="未审核">未审核</option>
                    <option value="已通过">已通过</option>
                    <option value="已拒绝">已拒绝</option>
                    <option value="已处理">已处理</option>
                  </select>
                </div>
              </div>

              {/* 举报列表 */}
              {reportsLoading ? (
                <div className="loading-state">加载中...</div>
              ) : reports.length > 0 ? (
                <div className="reports-list">
                  {reports.map((report) => {
                    const stateDisplay = getAuditStateDisplay(report.audit_state);
                    const canDelete = canDeleteReport(report);

                    return (
                      <div key={report.id} className="report-item">
                        <div className="report-header">
                          <div className="report-id">举报ID: {report.id}</div>
                          <div className="report-date">{formatDate(report.created_at)}</div>
                        </div>
                        <div className="report-content">
                          <div className="report-content-label">举报内容：</div>
                          <div className="report-content-text">{report.report_content}</div>
                        </div>
                        <div className="report-details">
                          {report.reported_user_id && (
                            <div className="report-detail-item">
                              <span className="detail-label">被举报用户ID：</span>
                              <span className="detail-value">{String(report.reported_user_id).padStart(10, '0')}</span>
                            </div>
                          )}
                          {report.group_id && (
                            <div className="report-detail-item">
                              <span className="detail-label">群聊ID：</span>
                              <span className="detail-value">{report.group_id}</span>
                            </div>
                          )}
                          {report.chat_message_id && (
                            <div className="report-detail-item">
                              <span className="detail-label">消息ID：</span>
                              <span className="detail-value">{report.chat_message_id}</span>
                            </div>
                          )}
                        </div>
                        <div className="report-footer">
                          <div className="report-state">
                            <span className="state-label">审核状态：</span>
                            <span
                              className="state-badge"
                              style={{ color: stateDisplay.color, borderColor: stateDisplay.color }}
                            >
                              {stateDisplay.text}
                            </span>
                          </div>
                          {canDelete && (
                            <button
                              className="delete-report-button"
                              onClick={() => handleDeleteReport(report.id)}
                              disabled={deletingReportId === report.id}
                              title="删除举报"
                            >
                              <Trash2 size={16} />
                              {deletingReportId === report.id ? '删除中...' : '删除'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">暂无举报记录</div>
              )}

              {/* 分页控件 */}
              {reportTotalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-button"
                    onClick={() => setReportCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={reportCurrentPage === 1}
                  >
                    上一页
                  </button>
                  <span className="pagination-info">
                    第 {reportCurrentPage} / {reportTotalPages} 页
                  </span>
                  <button
                    className="pagination-button"
                    onClick={() => setReportCurrentPage(prev => Math.min(reportTotalPages, prev + 1))}
                    disabled={reportCurrentPage === reportTotalPages}
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧操作栏 */}
        {activeNav === 'account' && (
          <div className="profile-actions-sidebar">
            <h2 className="section-title">个人信息</h2>
            <div className="action-links">
              <div 
                className={`action-link ${editingFields.has('phone') ? 'active' : ''}`}
                onClick={() => handleEditField('phone')}
              >
                {editingFields.has('phone') ? '取消编辑手机号' : '修改手机号'}
              </div>
              <div 
                className={`action-link ${editingFields.has('email') ? 'active' : ''}`}
                onClick={() => handleEditField('email')}
              >
                {editingFields.has('email') ? '取消编辑邮箱' : '修改电子邮箱'}
              </div>
              <div 
                className={`action-link ${editingFields.has('password') ? 'active' : ''}`}
                onClick={() => handleEditField('password')}
              >
                {editingFields.has('password') ? '取消编辑密码' : '修改密码'}
              </div>
            </div>
            {editingFields.size > 0 && (
              <div className="edit-actions">
                <button 
                  className="confirm-button"
                  onClick={handleUpdateFields}
                  disabled={updating}
                >
                  {updating ? '更新中...' : '确定'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

