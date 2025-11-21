import { useState, useEffect, useCallback } from 'react';
import { Menu, X, Search, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserInfo, clearUserInfo, isAdmin, getAuthHeaders, getAuthHeadersWithAdminToken } from '../utils/userStorage';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userInfo, setUserInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const usersPerPage = 10; // 每页显示的用户数
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    phone: '',
    email: '',
  });
  const [updating, setUpdating] = useState(false);
  
  // 群聊审核相关状态
  const [groupChats, setGroupChats] = useState([]);
  const [groupChatLoading, setGroupChatLoading] = useState(false);
  const [groupChatSearchTerm, setGroupChatSearchTerm] = useState('');
  const [groupChatCurrentPage, setGroupChatCurrentPage] = useState(1);
  const [groupChatTotalPages, setGroupChatTotalPages] = useState(1);
  const [avatarErrors, setAvatarErrors] = useState(new Set());
  const groupChatsPerPage = 10;

  // 审核修改群聊信息相关状态
  const [updateRequests, setUpdateRequests] = useState([]);
  const [updateRequestsLoading, setUpdateRequestsLoading] = useState(false);
  const [updateRequestsSearchTerm, setUpdateRequestsSearchTerm] = useState('');
  const [updateRequestsCurrentPage, setUpdateRequestsCurrentPage] = useState(1);
  const [updateRequestsTotalPages, setUpdateRequestsTotalPages] = useState(1);
  const [updateRequestsAvatarErrors, setUpdateRequestsAvatarErrors] = useState(new Set());
  const [updateRequestsAuditState, setUpdateRequestsAuditState] = useState('待审核'); // 默认显示待审核
  const updateRequestsPerPage = 10;

  // 审核举报信息相关状态
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsAuditState, setReportsAuditState] = useState(''); // 筛选状态：空字符串表示全部
  const [reportsReportedUserId, setReportsReportedUserId] = useState(''); // 筛选被举报用户ID
  const [reportsGroupId, setReportsGroupId] = useState(''); // 筛选群聊ID
  const [reportsCurrentPage, setReportsCurrentPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [auditingReportId, setAuditingReportId] = useState(null); // 正在审核的举报ID
  const reportsPerPage = 10;

  // 检查管理员权限
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/login');
      return;
    }

    const storedUserInfo = getUserInfo();
    if (storedUserInfo) {
      setUserInfo(storedUserInfo);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // 计算 skip 和 limit
      const skip = (currentPage - 1) * usersPerPage;
      const limit = usersPerPage;
      
      // 构建查询参数
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      });
      
      // 如果有搜索词，添加 q 参数
      if (searchTerm.trim()) {
        params.append('q', searchTerm.trim());
      }
      
      const response = await fetch(`http://127.0.0.1:8000/api/users/?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        // API 返回的是用户数组
        const usersList = Array.isArray(data) ? data : [];
        setUsers(usersList);
        
        // 计算总页数：如果返回的数据量等于 limit，可能还有更多数据
        // 我们允许用户继续翻页，直到返回的数据量小于 limit
        if (usersList.length === limit) {
          // 如果返回的数据量等于 limit，说明可能还有更多数据
          // 设置总页数为当前页+1，允许继续翻页
          setTotalPages(currentPage + 1);
        } else {
          // 如果返回的数据量小于 limit，说明这是最后一页
          setTotalPages(currentPage);
        }
        setTotalUsers(usersList.length);
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('获取用户列表失败:', errorData);
        setUsers([]);
        setTotalPages(1);
        setTotalUsers(0);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      setUsers([]);
      setTotalPages(1);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, usersPerPage]);

  // 当页码或搜索词变化时，重新获取用户列表
  useEffect(() => {
    if (userInfo) {
      fetchUsers();
    }
  }, [userInfo, fetchUsers]);

  const handleLogout = () => {
    clearUserInfo();
    navigate('/login');
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('确定要删除此用户吗？')) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/users/${userId}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        alert('删除成功');
        fetchUsers();
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        alert('删除失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除用户时发生错误');
    }
  };

  const handleModifyUser = async (userId) => {
    // 找到要编辑的用户
    const user = users.find(u => u.id === userId);
    if (!user) {
      alert('用户不存在');
      return;
    }

    // 加载用户详细信息（如果需要）
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/users/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const userData = await response.json();
        setEditingUser(userData);
        setEditFormData({
          username: userData.username || '',
          password: '', // 密码不预填充
          phone: userData.phone || '',
          email: userData.email || '',
        });
        setShowEditModal(true);
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        // 如果获取详细信息失败，使用列表中的数据
        setEditingUser(user);
        setEditFormData({
          username: user.username || '',
          password: '',
          phone: user.phone || '',
          email: user.email || '',
        });
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 使用列表中的数据
      setEditingUser(user);
      setEditFormData({
        username: user.username || '',
        password: '',
        phone: user.phone || '',
        email: user.email || '',
      });
      setShowEditModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setEditFormData({
      username: '',
      password: '',
      phone: '',
      email: '',
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!editingUser) {
      return;
    }

    setUpdating(true);
    try {
      // 构建更新数据，只包含有值的字段
      const updateData = {};
      if (editFormData.username.trim()) {
        updateData.username = editFormData.username.trim();
      }
      if (editFormData.password.trim()) {
        const password = editFormData.password.trim();
        // 验证密码长度至少6位
        if (password.length < 6) {
          alert('密码长度至少需要6位');
          setUpdating(false);
          return;
        }
        updateData.password = password;
      }
      if (editFormData.phone.trim()) {
        // 验证手机号格式
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(editFormData.phone.trim())) {
          alert('请输入正确的手机号格式');
          setUpdating(false);
          return;
        }
        updateData.phone = editFormData.phone.trim();
      }
      if (editFormData.email.trim()) {
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editFormData.email.trim())) {
          alert('请输入正确的邮箱格式');
          setUpdating(false);
          return;
        }
        updateData.email = editFormData.email.trim();
      }

      if (Object.keys(updateData).length === 0) {
        alert('请至少修改一个字段');
        setUpdating(false);
        return;
      }

      const response = await fetch(`http://127.0.0.1:8000/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('修改成功');
        handleCloseModal();
        fetchUsers(); // 刷新用户列表
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        const errorMessage = data.message || data.detail || data.error || '修改失败，请稍后重试';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('修改用户失败:', error);
      alert('修改用户时发生错误，请稍后重试');
    } finally {
      setUpdating(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  // 根据用户ID生成头像样式（使用模运算确保一致性）
  const getAvatarClass = (userId) => {
    const avatarClasses = ['avatar-female-pink', 'avatar-male-blue', 'avatar-female-purple'];
    const index = userId % avatarClasses.length;
    return avatarClasses[index] || 'avatar-default';
  };

  const formatUserId = (id) => {
    if (typeof id === 'number') {
      return `ID:${String(id).padStart(10, '0')}`;
    }
    return `ID:${String(id || '').padStart(10, '0')}`;
  };

  const formatUserNumber = (id) => {
    if (typeof id === 'number') {
      return String(id).padStart(3, '0');
    }
    return String(id || '').padStart(3, '0');
  };

  // 根据角色显示用户类型
  const getUserType = (role) => {
    return role === 'admin' ? '管理员' : '普通用户';
  };

  // 计算从创建时间到现在的时间差（显示更友好的格式）
  const calculateHoursAgo = (createdAt) => {
    if (!createdAt) {
      console.warn('created_at 为空:', createdAt);
      return '0h';
    }
    
    try {
      const created = new Date(createdAt);
      const now = new Date();
      
      // 检查日期是否有效
      if (isNaN(created.getTime())) {
        console.warn('无效的日期:', createdAt);
        return '无效时间';
      }
      
      const diffMs = now - created;
      
      // 如果是负数，说明时间在未来（可能是时区问题）
      if (diffMs < 0) {
        console.warn('时间差为负数，可能是时区问题:', {
          createdAt,
          created: created.toISOString(),
          now: now.toISOString(),
          diffMs
        });
        return '刚刚';
      }
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // 打印调试信息
      console.log('时间计算:', {
        createdAt,
        created: created.toISOString(),
        now: now.toISOString(),
        diffMs,
        diffMinutes,
        diffHours,
        diffDays
      });
      
      // 根据时间差返回合适的格式
      if (diffMinutes < 1) {
        return '刚刚';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`;
      } else if (diffHours < 24) {
        return `${diffHours}小时前`;
      } else {
        return `${diffDays}天前`;
      }
    } catch (error) {
      console.error('时间计算错误:', error, 'createdAt:', createdAt);
      return '时间错误';
    }
  };

  // 获取群聊审核列表
  const fetchGroupChats = useCallback(async () => {
    setGroupChatLoading(true);
    try {
      // 注意：如果后端路由顺序有问题（/api/groups/{id} 在 /api/groups/create-requests 之前），
      // 可能需要调整路径格式或联系后端开发者调整路由顺序
      const response = await fetch('http://127.0.0.1:8000/api/groups/create-requests', {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        // 打印接口返回的完整数据
        console.log('=== 群聊审核接口返回的完整数据 ===');
        console.log('原始数据:', data);
        console.log('数据类型:', Array.isArray(data) ? '数组' : typeof data);
        
        // API 返回的是群聊数组
        const groupsList = Array.isArray(data) ? data : [];
        
        // 打印每个群聊项的详细信息
        console.log('群聊列表数量:', groupsList.length);
        groupsList.forEach((chat, index) => {
          console.log(`--- 群聊 ${index + 1} ---`);
          console.log('完整数据:', chat);
          console.log('ID:', chat.id);
          console.log('名称:', chat.name);
          console.log('创建时间 (created_at):', chat.created_at);
          console.log('创建时间类型:', typeof chat.created_at);
          if (chat.created_at) {
            const createdDate = new Date(chat.created_at);
            console.log('解析后的日期:', createdDate);
            console.log('当前时间:', new Date());
            const diffMs = new Date() - createdDate;
            console.log('时间差（毫秒）:', diffMs);
            console.log('时间差（小时）:', Math.floor(diffMs / (1000 * 60 * 60)));
            console.log('时间差（分钟）:', Math.floor(diffMs / (1000 * 60)));
          }
          console.log('群聊类型:', chat.group_type);
          console.log('最多人数:', chat.member_limit);
          console.log('头像URL（原始）:', chat.avatar_url);
          if (chat.avatar_url) {
            const fullAvatarUrl = chat.avatar_url.startsWith('/') 
              ? `http://127.0.0.1:8000${chat.avatar_url}`
              : (chat.avatar_url.startsWith('http://') || chat.avatar_url.startsWith('https://'))
                ? chat.avatar_url
                : `http://127.0.0.1:8000/${chat.avatar_url}`;
            console.log('头像URL（完整）:', fullAvatarUrl);
          }
        });
        console.log('=== 数据打印结束 ===');
        
        // 清除头像错误状态（因为数据已刷新）
        setAvatarErrors(new Set());
        
        // 处理搜索过滤
        let filteredChats = groupsList;
        if (groupChatSearchTerm.trim()) {
          filteredChats = groupsList.filter(chat => 
            chat.name?.toLowerCase().includes(groupChatSearchTerm.toLowerCase()) ||
            String(chat.id).includes(groupChatSearchTerm)
          );
        }

        // 前端分页
        const startIndex = (groupChatCurrentPage - 1) * groupChatsPerPage;
        const endIndex = startIndex + groupChatsPerPage;
        const paginatedChats = filteredChats.slice(startIndex, endIndex);
        
        setGroupChats(paginatedChats);
        setGroupChatTotalPages(Math.ceil(filteredChats.length / groupChatsPerPage));
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('获取群聊审核列表失败:', errorData);
        
        // 如果是422错误且提示路径参数解析问题，可能是后端路由顺序问题
        if (response.status === 422 && errorData.detail) {
          const detail = Array.isArray(errorData.detail) ? errorData.detail[0] : errorData.detail;
          if (detail?.type === 'int_parsing' && detail?.input === 'create-requests') {
            console.error('路由错误：后端可能将 create-requests 解析为路径参数。请检查后端路由顺序，确保 /api/groups/create-requests 在 /api/groups/{id} 之前定义。');
          }
        }
        
        setGroupChats([]);
        setGroupChatTotalPages(1);
      }
    } catch (error) {
      console.error('获取群聊审核列表失败:', error);
      setGroupChats([]);
      setGroupChatTotalPages(1);
    } finally {
      setGroupChatLoading(false);
    }
  }, [groupChatCurrentPage, groupChatSearchTerm, groupChatsPerPage]);

  // 当切换到群聊审核页面或相关状态变化时，获取群聊列表
  useEffect(() => {
    if (activeNav === 'group-chat' && userInfo) {
      fetchGroupChats();
    }
  }, [activeNav, userInfo, fetchGroupChats]);

  // 处理群聊审核搜索
  const handleGroupChatSearch = (e) => {
    e.preventDefault();
    setGroupChatCurrentPage(1);
    fetchGroupChats();
  };

  // 处理群聊通过
  const handleApproveGroupChat = async (requestId) => {
    if (!window.confirm('确定要通过此群聊吗？')) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/create-requests/${requestId}/audit?action=approve`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        alert('审核通过成功');
        // 审核通过后直接从本地状态中删除，不再渲染
        setGroupChats(prevChats => {
          const filtered = prevChats.filter(chat => chat.id !== requestId);
          // 如果删除后当前页没有数据了，且不是第一页，则跳转到上一页
          if (filtered.length === 0 && groupChatCurrentPage > 1) {
            setGroupChatCurrentPage(prev => Math.max(1, prev - 1));
          }
          return filtered;
        });
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '审核失败，请稍后重试';
        alert(errorMessage);
        console.error('审核通过失败:', errorData);
      }
    } catch (error) {
      console.error('审核通过时发生错误:', error);
      alert('审核时发生错误，请稍后重试');
    }
  };

  // 处理群聊退回
  const handleRejectGroupChat = async (requestId) => {
    if (!window.confirm('确定要退回此群聊吗？')) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/create-requests/${requestId}/audit?action=reject`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        alert('退回成功');
        // 驳回后直接从本地状态中删除，不再渲染
        setGroupChats(prevChats => {
          const filtered = prevChats.filter(chat => chat.id !== requestId);
          // 如果删除后当前页没有数据了，且不是第一页，则跳转到上一页
          if (filtered.length === 0 && groupChatCurrentPage > 1) {
            setGroupChatCurrentPage(prev => Math.max(1, prev - 1));
          }
          return filtered;
        });
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '退回失败，请稍后重试';
        alert(errorMessage);
        console.error('退回失败:', errorData);
      }
    } catch (error) {
      console.error('退回时发生错误:', error);
      alert('退回时发生错误，请稍后重试');
    }
  };

  // 根据群聊ID生成头像样式
  const getGroupAvatarClass = (groupId) => {
    const avatarClasses = ['group-avatar-pink', 'group-avatar-teal', 'group-avatar-purple'];
    const index = groupId % avatarClasses.length;
    return avatarClasses[index] || 'group-avatar-default';
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

  // 格式化群ID
  const formatGroupId = (id) => {
    if (typeof id === 'number') {
      return `群ID:${String(id).padStart(10, '0')}`;
    }
    const idStr = String(id || '');
    // 如果已经是10位数字格式，直接使用；否则补齐
    if (idStr.length >= 10 && /^\d+$/.test(idStr)) {
      return `群ID:${idStr}`;
    }
    return `群ID:${idStr.padStart(10, '0')}`;
  };

  // 获取修改请求列表
  const fetchUpdateRequests = useCallback(async () => {
    setUpdateRequestsLoading(true);
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        audit_state: updateRequestsAuditState || '待审核',
        skip: ((updateRequestsCurrentPage - 1) * updateRequestsPerPage).toString(),
        limit: updateRequestsPerPage.toString(),
      });

      // 如果有搜索词（可能是群ID），添加 group_id 参数
      if (updateRequestsSearchTerm.trim()) {
        const searchId = parseInt(updateRequestsSearchTerm.trim(), 10);
        if (!isNaN(searchId)) {
          params.append('group_id', searchId.toString());
        }
      }

      const response = await fetch(`http://127.0.0.1:8000/api/groups/update-requests`, {
        method: 'GET',
        headers: getAuthHeadersWithAdminToken(),
      });

      if (response.ok) {
        const data = await response.json();
        const requestsList = Array.isArray(data) ? data : [];
        
        // 清除头像错误状态
        setUpdateRequestsAvatarErrors(new Set());
        
        // 如果有搜索词，进行前端过滤（用于名称搜索）
        let filteredRequests = requestsList;
        if (updateRequestsSearchTerm.trim()) {
          const searchTerm = updateRequestsSearchTerm.toLowerCase();
          filteredRequests = requestsList.filter(request => 
            request.name?.toLowerCase().includes(searchTerm) ||
            String(request.group_id || request.id).includes(updateRequestsSearchTerm)
          );
        }

        setUpdateRequests(filteredRequests);
        // 计算总页数
        if (filteredRequests.length === updateRequestsPerPage) {
          setUpdateRequestsTotalPages(updateRequestsCurrentPage + 1);
        } else {
          setUpdateRequestsTotalPages(updateRequestsCurrentPage);
        }
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('获取修改请求列表失败:', errorData);
        setUpdateRequests([]);
        setUpdateRequestsTotalPages(1);
      }
    } catch (error) {
      console.error('获取修改请求列表失败:', error);
      setUpdateRequests([]);
      setUpdateRequestsTotalPages(1);
    } finally {
      setUpdateRequestsLoading(false);
    }
  }, [updateRequestsCurrentPage, updateRequestsSearchTerm, updateRequestsAuditState, updateRequestsPerPage, navigate]);

  // 当切换到审核修改群聊信息页面或相关状态变化时，获取修改请求列表
  useEffect(() => {
    if (activeNav === 'update-requests' && userInfo) {
      fetchUpdateRequests();
    }
  }, [activeNav, userInfo, fetchUpdateRequests]);

  // 处理修改请求搜索
  const handleUpdateRequestsSearch = (e) => {
    e.preventDefault();
    setUpdateRequestsCurrentPage(1);
    fetchUpdateRequests();
  };

  // 处理修改请求通过
  const handleApproveUpdateRequest = async (requestId) => {
    if (!window.confirm('确定要通过此修改请求吗？')) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/update-requests/${requestId}/audit?action=approve`,
        {
          method: 'POST',
          headers: getAuthHeadersWithAdminToken(),
        }
      );

      if (response.ok) {
        alert('审核通过成功');
        // 审核通过后直接从本地状态中删除，不再渲染（无论当前筛选状态如何）
        setUpdateRequests(prevRequests => {
          const filtered = prevRequests.filter(request => {
            const reqId = request.id || request.request_id;
            return reqId !== requestId;
          });
          // 如果删除后当前页没有数据了，且不是第一页，则跳转到上一页
          if (filtered.length === 0 && updateRequestsCurrentPage > 1) {
            setUpdateRequestsCurrentPage(prev => Math.max(1, prev - 1));
          }
          return filtered;
        });
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '审核失败，请稍后重试';
        alert(errorMessage);
        console.error('审核通过失败:', errorData);
      }
    } catch (error) {
      console.error('审核通过时发生错误:', error);
      alert('审核时发生错误，请稍后重试');
    }
  };

  // 处理修改请求退回
  const handleRejectUpdateRequest = async (requestId) => {
    if (!window.confirm('确定要退回此修改请求吗？')) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/update-requests/${requestId}/audit?action=reject`,
        {
          method: 'POST',
          headers: getAuthHeadersWithAdminToken(),
        }
      );

      if (response.ok) {
        alert('退回成功');
        // 驳回后直接从本地状态中删除，不再渲染（无论当前筛选状态如何）
        setUpdateRequests(prevRequests => {
          const filtered = prevRequests.filter(request => {
            const reqId = request.id || request.request_id;
            return reqId !== requestId;
          });
          // 如果删除后当前页没有数据了，且不是第一页，则跳转到上一页
          if (filtered.length === 0 && updateRequestsCurrentPage > 1) {
            setUpdateRequestsCurrentPage(prev => Math.max(1, prev - 1));
          }
          return filtered;
        });
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '退回失败，请稍后重试';
        alert(errorMessage);
        console.error('退回失败:', errorData);
      }
    } catch (error) {
      console.error('退回时发生错误:', error);
      alert('退回时发生错误，请稍后重试');
    }
  };

  // 获取举报列表
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const skip = (reportsCurrentPage - 1) * reportsPerPage;
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: reportsPerPage.toString(),
      });

      // 添加筛选参数
      if (reportsAuditState) {
        params.append('state', reportsAuditState);
      }
      if (reportsReportedUserId.trim()) {
        const userId = parseInt(reportsReportedUserId.trim(), 10);
        if (!isNaN(userId)) {
          params.append('reported_user_id', userId.toString());
        }
      }
      if (reportsGroupId.trim()) {
        const groupId = parseInt(reportsGroupId.trim(), 10);
        if (!isNaN(groupId)) {
          params.append('group_id', groupId.toString());
        }
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/reports/?${params.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeadersWithAdminToken(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('获取举报列表成功:', data);
        
        // 假设API返回格式为数组或 { items: [], total: 0 }
        if (Array.isArray(data)) {
          setReports(data);
          // 如果返回的数据量等于reportsPerPage，可能还有更多页面
          if (data.length === reportsPerPage) {
            setReportsTotalPages(reportsCurrentPage + 1);
          } else {
            setReportsTotalPages(Math.max(1, reportsCurrentPage));
          }
        } else if (data.items) {
          setReports(data.items || []);
          const total = data.total || data.items?.length || 0;
          setReportsTotalPages(Math.max(1, Math.ceil(total / reportsPerPage)));
        } else {
          setReports([]);
          setReportsTotalPages(1);
        }
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('获取举报列表失败:', errorData);
        setReports([]);
        setReportsTotalPages(1);
      }
    } catch (error) {
      console.error('获取举报列表失败:', error);
      setReports([]);
      setReportsTotalPages(1);
    } finally {
      setReportsLoading(false);
    }
  }, [reportsCurrentPage, reportsAuditState, reportsReportedUserId, reportsGroupId, reportsPerPage, navigate]);

  // 当切换到审核举报信息页面或相关状态变化时，获取举报列表
  useEffect(() => {
    if (activeNav === 'reports' && userInfo) {
      fetchReports();
    }
  }, [activeNav, userInfo, fetchReports]);

  // 处理举报搜索
  const handleReportsSearch = (e) => {
    e.preventDefault();
    setReportsCurrentPage(1);
    fetchReports();
  };

  // 处理举报审核（通过或驳回）
  const handleAuditReport = async (reportId, action) => {
    const actionText = action === 'approve' ? '通过' : '驳回';
    if (!window.confirm(`确定要${actionText}此举报吗？`)) {
      return;
    }

    setAuditingReportId(reportId);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/reports/${reportId}/audit?action=${action}`,
        {
          method: 'POST',
          headers: getAuthHeadersWithAdminToken(),
        }
      );

      if (response.ok) {
        alert(`${actionText}成功`);
        // 刷新列表
        fetchReports();
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || `${actionText}失败，请稍后重试`;
        alert(errorMessage);
        console.error(`${actionText}失败:`, errorData);
      }
    } catch (error) {
      console.error(`${actionText}时发生错误:`, error);
      alert(`${actionText}时发生错误，请稍后重试`);
    } finally {
      setAuditingReportId(null);
    }
  };

  // 格式化日期
  const formatReportDate = (dateString) => {
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
  const getReportAuditStateDisplay = (state) => {
    const stateMap = {
      '未审核': { text: '未审核', color: '#faad14' },
      '待审核': { text: '待审核', color: '#faad14' },
      '已通过': { text: '已通过', color: '#52c41a' },
      '已拒绝': { text: '已拒绝', color: '#ff4d4f' },
      '已驳回': { text: '已驳回', color: '#ff4d4f' },
      '已处理': { text: '已处理', color: '#1890ff' },
    };
    return stateMap[state] || { text: state || '未知', color: '#999999' };
  };

  if (!userInfo) {
    return null;
  }

  return (
    <div className="admin-container">
      {/* 顶部Header */}
      <div className="admin-header">
        <div className="header-left">
          <button 
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} color="#1890ff" />
            <div className="menu-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
          <h1 className="admin-title">管理系统</h1>
        </div>
        <div className="header-right">
          <div className="admin-user-info">
            <span className="admin-user-number">{userInfo ? formatUserNumber(userInfo.id || userInfo.userId) : '000'}</span>
            <span className="admin-user-role">管理员</span>
            <div className="admin-avatar admin-avatar-blue">
              <User size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-content-wrapper">
        {/* 左侧导航栏 */}
        <div className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div
            className={`nav-item ${activeNav === 'users' ? 'active' : ''}`}
            onClick={() => setActiveNav('users')}
          >
            用户账号管理
          </div>
          <div
            className={`nav-item ${activeNav === 'group-chat' ? 'active' : ''}`}
            onClick={() => setActiveNav('group-chat')}
          >
            审核群聊信息
          </div>
          <div
            className={`nav-item ${activeNav === 'update-requests' ? 'active' : ''}`}
            onClick={() => setActiveNav('update-requests')}
          >
            审核修改群聊信息
          </div>
          <div
            className={`nav-item ${activeNav === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveNav('reports')}
          >
            审核举报信息
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="admin-main">
          {activeNav === 'users' && (
            <>
              <h2 className="section-title">用户信息</h2>
              
              {/* 搜索栏 */}
              <form className="search-bar-top" onSubmit={handleSearch}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="search-button">
                  <Search size={20} color="#1890ff" />
                </button>
              </form>

              {/* 用户列表表格 */}
              <div className="users-table">
                {loading ? (
                  <div className="loading">加载中...</div>
                ) : (
                  users.length > 0 ? (
                    users.map((user) => (
                      <div key={user.id} className="user-row">
                        <div className="user-avatar-cell">
                          <div className={`user-avatar-small ${getAvatarClass(user.id)}`}>
                            <User size={16} />
                          </div>
                        </div>
                        <div className="user-number">{formatUserNumber(user.id)}</div>
                        <div className="user-id">{formatUserId(user.id)}</div>
                        <div className="user-username">{user.username || '-'}</div>
                        <div className="user-phone">{user.phone || '-'}</div>
                        <div className="user-email">{user.email || '-'}</div>
                        <div className="user-type">{getUserType(user.role)}</div>
                        <div className="user-actions">
                          <button 
                            className="action-link modify-link"
                            onClick={() => handleModifyUser(user.id)}
                          >
                            修改
                          </button>
                          <button 
                            className="action-link delete-link"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="loading">暂无用户数据</div>
                  )
                )}
              </div>

              {/* 分页控件 */}
              <div className="pagination-wrapper">
                <div className="pagination">
                  <button 
                    className="pagination-button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Newer
                  </button>
                  <div className="pagination-numbers">
                    {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      // 确保页码在有效范围内
                      if (pageNum < 1 || pageNum > totalPages) {
                        return null;
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    className="pagination-button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Older
                  </button>
                </div>
                <div className="search-bar-bottom">
                  <Search size={16} color="#666" />
                  <input
                    type="text"
                    className="search-input-small"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                  />
                  {searchTerm && (
                    <button 
                      className="clear-search"
                      onClick={() => {
                        setSearchTerm('');
                        setCurrentPage(1);
                        fetchUsers();
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {activeNav === 'group-chat' && (
            <>
              <h2 className="section-title">审核群聊信息</h2>
              
              {/* 搜索栏 */}
              <form className="search-bar-top" onSubmit={handleGroupChatSearch}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search..."
                  value={groupChatSearchTerm}
                  onChange={(e) => setGroupChatSearchTerm(e.target.value)}
                />
                <button type="submit" className="search-button">
                  <Search size={20} color="#1890ff" />
                </button>
              </form>

              {/* 群聊列表 */}
              <div className="group-chats-table">
                {groupChatLoading ? (
                  <div className="loading">加载中...</div>
                ) : (
                  groupChats.length > 0 ? (
                    groupChats.map((chat) => {
                      const avatarUrl = getGroupAvatarUrl(chat);
                      const hoursAgo = calculateHoursAgo(chat.created_at);
                      const hasAvatarError = avatarErrors.has(chat.id);
                      const showAvatar = avatarUrl && !hasAvatarError;
                      
                      return (
                        <div key={chat.id} className="group-chat-row">
                          <div className="group-chat-avatar-cell">
                            {showAvatar ? (
                              <img 
                                src={avatarUrl} 
                                alt={chat.name}
                                className="group-chat-avatar-img"
                                onError={() => {
                                  setAvatarErrors(prev => new Set([...prev, chat.id]));
                                }}
                              />
                            ) : (
                              <div className={`group-chat-avatar-small ${getGroupAvatarClass(chat.id)}`}>
                                <User size={16} />
                              </div>
                            )}
                          </div>
                          <div className="group-chat-name">{chat.name || '未命名群聊'}</div>
                          <div className="group-chat-id">{formatGroupId(chat.id)}</div>
                          <div className="group-chat-type">{chat.group_type || '未知类型'}</div>
                          <div className="group-chat-member-limit">最多{chat.member_limit || 0}人</div>
                          <div className="group-chat-time">
                            <Clock size={16} color="#666" />
                            <span>{hoursAgo}</span>
                          </div>
                          <div className="group-chat-actions">
                            <button 
                              className="action-link approve-link"
                              onClick={() => handleApproveGroupChat(chat.id)}
                            >
                              通过
                            </button>
                            <button 
                              className="action-link reject-link"
                              onClick={() => handleRejectGroupChat(chat.id)}
                            >
                              退回
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="loading">暂无群聊数据</div>
                  )
                )}
              </div>

              {/* 分页控件 */}
              <div className="pagination-wrapper">
                <div className="pagination">
                  <button 
                    className="pagination-button"
                    onClick={() => setGroupChatCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={groupChatCurrentPage === 1}
                  >
                    Newer
                  </button>
                  <div className="pagination-numbers">
                    {groupChatTotalPages > 0 && Array.from({ length: Math.min(5, groupChatTotalPages) }, (_, i) => {
                      let pageNum;
                      if (groupChatTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (groupChatCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (groupChatCurrentPage >= groupChatTotalPages - 2) {
                        pageNum = groupChatTotalPages - 4 + i;
                      } else {
                        pageNum = groupChatCurrentPage - 2 + i;
                      }
                      // 确保页码在有效范围内
                      if (pageNum < 1 || pageNum > groupChatTotalPages) {
                        return null;
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-number ${groupChatCurrentPage === pageNum ? 'active' : ''}`}
                          onClick={() => setGroupChatCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    className="pagination-button"
                    onClick={() => setGroupChatCurrentPage(prev => Math.min(groupChatTotalPages, prev + 1))}
                    disabled={groupChatCurrentPage === groupChatTotalPages}
                  >
                    Older
                  </button>
                </div>
                <div className="search-bar-bottom">
                  <Search size={16} color="#666" />
                  <input
                    type="text"
                    className="search-input-small"
                    placeholder="Search..."
                    value={groupChatSearchTerm}
                    onChange={(e) => setGroupChatSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGroupChatSearch(e)}
                  />
                  {groupChatSearchTerm && (
                    <button 
                      className="clear-search"
                      onClick={() => {
                        setGroupChatSearchTerm('');
                        setGroupChatCurrentPage(1);
                        fetchGroupChats();
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {activeNav === 'update-requests' && (
            <>
              <h2 className="section-title">审核修改群聊信息</h2>
              
              {/* 审核状态筛选 */}
              <div className="audit-state-filter" style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', color: '#666' }}>审核状态：</label>
                <select
                  value={updateRequestsAuditState}
                  onChange={(e) => {
                    setUpdateRequestsAuditState(e.target.value);
                    setUpdateRequestsCurrentPage(1);
                  }}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="待审核">待审核</option>
                  <option value="已通过">已通过</option>
                  <option value="已退回">已退回</option>
                </select>
              </div>
              
              {/* 搜索栏 */}
              <form className="search-bar-top" onSubmit={handleUpdateRequestsSearch}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="搜索群聊名称或群ID..."
                  value={updateRequestsSearchTerm}
                  onChange={(e) => setUpdateRequestsSearchTerm(e.target.value)}
                />
                <button type="submit" className="search-button">
                  <Search size={20} color="#1890ff" />
                </button>
              </form>

              {/* 修改请求列表 */}
              <div className="group-chats-table">
                {updateRequestsLoading ? (
                  <div className="loading">加载中...</div>
                ) : (
                  updateRequests.length > 0 ? (
                    updateRequests.map((request) => {
                      const avatarUrl = getGroupAvatarUrl(request);
                      const hoursAgo = calculateHoursAgo(request.created_at);
                      const hasAvatarError = updateRequestsAvatarErrors.has(request.id || request.request_id);
                      const showAvatar = avatarUrl && !hasAvatarError;
                      const requestId = request.id || request.request_id;
                      
                      return (
                        <div key={requestId} className="group-chat-row">
                          <div className="group-chat-avatar-cell">
                            {showAvatar ? (
                              <img 
                                src={avatarUrl} 
                                alt={request.name}
                                className="group-chat-avatar-img"
                                onError={() => {
                                  setUpdateRequestsAvatarErrors(prev => new Set([...prev, requestId]));
                                }}
                              />
                            ) : (
                              <div className={`group-chat-avatar-small ${getGroupAvatarClass(request.group_id || request.id)}`}>
                                <User size={16} />
                              </div>
                            )}
                          </div>
                          <div className="group-chat-name">{request.name || '未命名群聊'}</div>
                          <div className="group-chat-id">{formatGroupId(request.group_id || request.id)}</div>
                          <div className="group-chat-type">{request.group_type || '未知类型'}</div>
                          <div className="group-chat-member-limit">最多{request.member_limit || 0}人</div>
                          <div className="group-chat-time">
                            <Clock size={16} color="#666" />
                            <span>{hoursAgo}</span>
                          </div>
                          <div className="group-chat-actions">
                            {updateRequestsAuditState === '待审核' && (
                              <>
                                <button 
                                  className="action-link approve-link"
                                  onClick={() => handleApproveUpdateRequest(requestId)}
                                >
                                  通过
                                </button>
                                <button 
                                  className="action-link reject-link"
                                  onClick={() => handleRejectUpdateRequest(requestId)}
                                >
                                  退回
                                </button>
                              </>
                            )}
                            {updateRequestsAuditState !== '待审核' && (
                              <span style={{ color: '#999', fontSize: '14px' }}>
                                {updateRequestsAuditState}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="loading">暂无修改请求数据</div>
                  )
                )}
              </div>

              {/* 分页控件 */}
              <div className="pagination-wrapper">
                <div className="pagination">
                  <button 
                    className="pagination-button"
                    onClick={() => setUpdateRequestsCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={updateRequestsCurrentPage === 1}
                  >
                    Newer
                  </button>
                  <div className="pagination-numbers">
                    {updateRequestsTotalPages > 0 && Array.from({ length: Math.min(5, updateRequestsTotalPages) }, (_, i) => {
                      let pageNum;
                      if (updateRequestsTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (updateRequestsCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (updateRequestsCurrentPage >= updateRequestsTotalPages - 2) {
                        pageNum = updateRequestsTotalPages - 4 + i;
                      } else {
                        pageNum = updateRequestsCurrentPage - 2 + i;
                      }
                      // 确保页码在有效范围内
                      if (pageNum < 1 || pageNum > updateRequestsTotalPages) {
                        return null;
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-number ${updateRequestsCurrentPage === pageNum ? 'active' : ''}`}
                          onClick={() => setUpdateRequestsCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    className="pagination-button"
                    onClick={() => setUpdateRequestsCurrentPage(prev => Math.min(updateRequestsTotalPages, prev + 1))}
                    disabled={updateRequestsCurrentPage === updateRequestsTotalPages}
                  >
                    Older
                  </button>
                </div>
                <div className="search-bar-bottom">
                  <Search size={16} color="#666" />
                  <input
                    type="text"
                    className="search-input-small"
                    placeholder="Search..."
                    value={updateRequestsSearchTerm}
                    onChange={(e) => setUpdateRequestsSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateRequestsSearch(e)}
                  />
                  {updateRequestsSearchTerm && (
                    <button 
                      className="clear-search"
                      onClick={() => {
                        setUpdateRequestsSearchTerm('');
                        setUpdateRequestsCurrentPage(1);
                        fetchUpdateRequests();
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {activeNav === 'reports' && (
            <>
              <h2 className="section-title">审核举报信息</h2>
              
              {/* 筛选区域 */}
              <div className="reports-filters" style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: '#666', whiteSpace: 'nowrap' }}>审核状态：</label>
                    <select
                      value={reportsAuditState}
                      onChange={(e) => {
                        setReportsAuditState(e.target.value);
                        setReportsCurrentPage(1);
                      }}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        minWidth: '120px'
                      }}
                    >
                      <option value="">全部</option>
                      <option value="未审核">未审核</option>
                      <option value="待审核">待审核</option>
                      <option value="已通过">已通过</option>
                      <option value="已拒绝">已拒绝</option>
                      <option value="已驳回">已驳回</option>
                      <option value="已处理">已处理</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: '#666', whiteSpace: 'nowrap' }}>被举报用户ID：</label>
                    <input
                      type="text"
                      value={reportsReportedUserId}
                      onChange={(e) => setReportsReportedUserId(e.target.value)}
                      placeholder="输入用户ID"
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        fontSize: '14px',
                        width: '120px'
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && handleReportsSearch(e)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: '#666', whiteSpace: 'nowrap' }}>群聊ID：</label>
                    <input
                      type="text"
                      value={reportsGroupId}
                      onChange={(e) => setReportsGroupId(e.target.value)}
                      placeholder="输入群聊ID"
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        fontSize: '14px',
                        width: '120px'
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && handleReportsSearch(e)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleReportsSearch}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: '#1890ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#40a9ff'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#1890ff'}
                  >
                    搜索
                  </button>
                  {(reportsReportedUserId || reportsGroupId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setReportsReportedUserId('');
                        setReportsGroupId('');
                        setReportsCurrentPage(1);
                        fetchReports();
                      }}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: '#f5f5f5',
                        color: '#333',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>

              {/* 举报列表 */}
              <div className="reports-table" style={{ marginBottom: '24px' }}>
                {reportsLoading ? (
                  <div className="loading">加载中...</div>
                ) : reports.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {reports.map((report) => {
                      const stateDisplay = getReportAuditStateDisplay(report.audit_state);
                      const canAudit = !report.audit_state || report.audit_state === '未审核' || report.audit_state === '待审核';

                      return (
                        <div key={report.id} style={{
                          padding: '20px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          transition: 'box-shadow 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>举报ID: {report.id}</div>
                            <div style={{ fontSize: '12px', color: '#999' }}>{formatReportDate(report.created_at)}</div>
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>举报内容：</div>
                            <div style={{
                              fontSize: '14px',
                              color: '#333',
                              lineHeight: '1.6',
                              padding: '12px',
                              backgroundColor: '#fafafa',
                              borderRadius: '4px',
                              whiteSpace: 'pre-wrap',
                              wordWrap: 'break-word'
                            }}>
                              {report.report_content}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '12px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                            <div style={{ fontSize: '14px' }}>
                              <span style={{ color: '#666' }}>举报用户ID：</span>
                              <span style={{ color: '#333', fontWeight: '500' }}>{String(report.user_id || '').padStart(10, '0')}</span>
                            </div>
                            {report.reported_user_id && (
                              <div style={{ fontSize: '14px' }}>
                                <span style={{ color: '#666' }}>被举报用户ID：</span>
                                <span style={{ color: '#333', fontWeight: '500' }}>{String(report.reported_user_id).padStart(10, '0')}</span>
                              </div>
                            )}
                            {report.group_id && (
                              <div style={{ fontSize: '14px' }}>
                                <span style={{ color: '#666' }}>群聊ID：</span>
                                <span style={{ color: '#333', fontWeight: '500' }}>{report.group_id}</span>
                              </div>
                            )}
                            {report.chat_message_id && (
                              <div style={{ fontSize: '14px' }}>
                                <span style={{ color: '#666' }}>消息ID：</span>
                                <span style={{ color: '#333', fontWeight: '500' }}>{report.chat_message_id}</span>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', color: '#666' }}>审核状态：</span>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                border: `1px solid ${stateDisplay.color}`,
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '500',
                                color: stateDisplay.color,
                                backgroundColor: 'rgba(255, 255, 255, 0.8)'
                              }}>
                                {stateDisplay.text}
                              </span>
                            </div>
                            {canAudit && (
                              <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                  className="action-link approve-link"
                                  onClick={() => handleAuditReport(report.id, 'approve')}
                                  disabled={auditingReportId === report.id}
                                  style={{ cursor: auditingReportId === report.id ? 'not-allowed' : 'pointer', opacity: auditingReportId === report.id ? 0.6 : 1 }}
                                >
                                  {auditingReportId === report.id ? '处理中...' : '通过'}
                                </button>
                                <button
                                  className="action-link reject-link"
                                  onClick={() => handleAuditReport(report.id, 'reject')}
                                  disabled={auditingReportId === report.id}
                                  style={{ cursor: auditingReportId === report.id ? 'not-allowed' : 'pointer', opacity: auditingReportId === report.id ? 0.6 : 1 }}
                                >
                                  {auditingReportId === report.id ? '处理中...' : '驳回'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="loading">暂无举报数据</div>
                )}
              </div>

              {/* 分页控件 */}
              {reportsTotalPages > 1 && (
                <div className="pagination-wrapper">
                  <div className="pagination">
                    <button 
                      className="pagination-button"
                      onClick={() => setReportsCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={reportsCurrentPage === 1}
                    >
                      Newer
                    </button>
                    <div className="pagination-numbers">
                      {reportsTotalPages > 0 && Array.from({ length: Math.min(5, reportsTotalPages) }, (_, i) => {
                        let pageNum;
                        if (reportsTotalPages <= 5) {
                          pageNum = i + 1;
                        } else if (reportsCurrentPage <= 3) {
                          pageNum = i + 1;
                        } else if (reportsCurrentPage >= reportsTotalPages - 2) {
                          pageNum = reportsTotalPages - 4 + i;
                        } else {
                          pageNum = reportsCurrentPage - 2 + i;
                        }
                        if (pageNum < 1 || pageNum > reportsTotalPages) {
                          return null;
                        }
                        return (
                          <button
                            key={pageNum}
                            className={`pagination-number ${reportsCurrentPage === pageNum ? 'active' : ''}`}
                            onClick={() => setReportsCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button 
                      className="pagination-button"
                      onClick={() => setReportsCurrentPage(prev => Math.min(reportsTotalPages, prev + 1))}
                      disabled={reportsCurrentPage === reportsTotalPages}
                    >
                      Older
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 修改用户模态框 */}
      {showEditModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">修改用户信息</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleUpdateUser}>
              <div className="form-group">
                <label className="form-label">用户名</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="请输入用户名"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">密码（留空则不修改）</label>
                <input
                  type="password"
                  className="form-input"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="请输入新密码（留空则不修改）"
                />
              </div>
              <div className="form-group">
                <label className="form-label">手机号</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="请输入手机号"
                />
              </div>
              <div className="form-group">
                <label className="form-label">邮箱</label>
                <input
                  type="email"
                  className="form-input"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="请输入邮箱"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-button cancel-button"
                  onClick={handleCloseModal}
                  disabled={updating}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="modal-button confirm-button"
                  disabled={updating}
                >
                  {updating ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

