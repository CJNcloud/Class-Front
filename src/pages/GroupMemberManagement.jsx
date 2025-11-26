import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, X, Search, XCircle, Flag } from 'lucide-react';
import { getAuthHeadersForGroupInfo, getAuthHeadersWithUserId, getUserInfo, clearUserInfo } from '../utils/userStorage';
import './GroupMemberManagement.css';

const GroupMemberManagement = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'members'
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null); // 群聊信息，用于获取群主ID
  const [currentUser, setCurrentUser] = useState(null); // 当前用户信息
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [avatarErrors, setAvatarErrors] = useState(new Set());
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [processingMemberId, setProcessingMemberId] = useState(null); // 正在处理的成员ID
  const [searchQuery, setSearchQuery] = useState(''); // 搜索关键词
  const [isSearching, setIsSearching] = useState(false); // 是否正在搜索
  const [showReportModal, setShowReportModal] = useState(false); // 是否显示举报模态框
  const [reportingUserId, setReportingUserId] = useState(null); // 被举报的用户ID
  const [reportContent, setReportContent] = useState(''); // 举报内容
  const [submittingReport, setSubmittingReport] = useState(false); // 是否正在提交举报
  const itemsPerPage = 50;

  // 获取当前用户信息
  useEffect(() => {
    const user = getUserInfo();
    setCurrentUser(user);
  }, []);

  // 获取群聊信息（用于判断是否是群主）
  useEffect(() => {
    if (!groupId) return;

    const fetchGroupInfo = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/groups/${groupId}`,
          {
            method: 'GET',
            headers: getAuthHeadersForGroupInfo(),
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('获取群聊信息成功:', data);
          setGroupInfo(data);
        } else {
          console.error('获取群聊信息失败');
        }
      } catch (error) {
        console.error('获取群聊信息时发生错误:', error);
      }
    };

    fetchGroupInfo();
  }, [groupId]);

  // 判断当前用户是否是群主
  const isOwner = () => {
    if (!groupInfo || !currentUser) return false;
    const ownerId = groupInfo.created_by_user_id;
    const userId = currentUser.id || currentUser.userId;
    return ownerId && userId && String(ownerId) === String(userId);
  };

  // 判断是否是当前用户
  const isCurrentUser = (memberUserId) => {
    if (!currentUser || !memberUserId) return false;
    const userId = currentUser.id || currentUser.userId;
    return String(memberUserId) === String(userId);
  };

  // 根据用户ID生成头像样式
  const getUserAvatarClass = (userId) => {
    const avatarClasses = ['user-avatar-teal', 'user-avatar-purple', 'user-avatar-pink', 'user-avatar-yellow', 'user-avatar-blue'];
    const index = userId % avatarClasses.length;
    return avatarClasses[index] || 'user-avatar-teal';
  };

  // 获取入群申请列表
  useEffect(() => {
    if (activeTab !== 'requests' || !groupId) {
      return;
    }

    const fetchJoinRequests = async () => {
      setJoinRequestsLoading(true);
      try {
        const skip = (currentPage - 1) * itemsPerPage;
        const response = await fetch(
          `http://127.0.0.1:8000/api/groups/${groupId}/join-requests?state=未审核&skip=${skip}&limit=${itemsPerPage}`,
          {
            method: 'GET',
            headers: getAuthHeadersForGroupInfo(),
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('获取入群申请列表成功:', data);
          
          // 假设API返回格式为 { items: [], total: 0 } 或直接是数组
          if (Array.isArray(data)) {
            setJoinRequests(data);
            // 如果返回的数据量等于itemsPerPage，可能还有更多页面
            if (data.length === itemsPerPage) {
              setTotalPages(currentPage + 1); // 至少还有一页
            } else {
              setTotalPages(Math.max(1, currentPage));
            }
          } else if (data.items) {
            setJoinRequests(data.items || []);
            const total = data.total || data.items?.length || 0;
            setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
          } else {
            setJoinRequests([]);
            setTotalPages(1);
          }
        } else {
          // 如果是401未授权，清除用户信息并跳转到登录页
          if (response.status === 401) {
            clearUserInfo();
            navigate('/login');
            return;
          }
          
          // 403可能是权限不足，403/404等错误不应该跳转，只是显示空列表
          if (response.status === 403 || response.status === 404) {
            console.warn('无权查看或群聊不存在');
            setJoinRequests([]);
            setTotalPages(1);
            return;
          }
          
          const errorData = await response.json().catch(() => ({}));
          console.error('获取入群申请列表失败:', errorData);
          // 不显示alert，只记录错误，显示空列表
          setJoinRequests([]);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('获取入群申请列表失败:', error);
        // 网络错误时显示空列表，不跳转
        setJoinRequests([]);
        setTotalPages(1);
      } finally {
        setJoinRequestsLoading(false);
      }
    };

    fetchJoinRequests();
  }, [groupId, currentPage, navigate, activeTab]);

  // 获取群成员列表的函数
  const fetchMembers = useCallback(async () => {
    if (!groupId) return;
    
    setMembersLoading(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/${groupId}/members`,
        {
          method: 'GET',
          headers: getAuthHeadersForGroupInfo(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('获取群成员列表成功:', data);
        
        // 假设API返回格式为数组或 { items: [] }
        if (Array.isArray(data)) {
          setMembers(data);
        } else if (data.items) {
          setMembers(data.items || []);
        } else {
          setMembers([]);
        }
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        // 403/404等错误显示空列表
        if (response.status === 403 || response.status === 404) {
          console.warn('无权查看或群聊不存在');
          setMembers([]);
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('获取群成员列表失败:', errorData);
        setMembers([]);
      }
    } catch (error) {
      console.error('获取群成员列表失败:', error);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [groupId, navigate]);

  // 搜索成员函数
  const searchMembers = useCallback(async (query) => {
    if (!groupId || !query.trim()) {
      // 如果搜索关键词为空，加载所有成员
      fetchMembers();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setMembersLoading(true);
    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/${groupId}/members/search?q=${encodedQuery}`,
        {
          method: 'GET',
          headers: getAuthHeadersForGroupInfo(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('搜索群成员成功:', data);
        
        // 假设API返回格式为数组或 { items: [] }
        if (Array.isArray(data)) {
          setMembers(data);
        } else if (data.items) {
          setMembers(data.items || []);
        } else {
          setMembers([]);
        }
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        // 403/404等错误显示空列表
        if (response.status === 403 || response.status === 404) {
          console.warn('无权查看或群聊不存在');
          setMembers([]);
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('搜索群成员失败:', errorData);
        setMembers([]);
      }
    } catch (error) {
      console.error('搜索群成员失败:', error);
      setMembers([]);
    } finally {
      setMembersLoading(false);
      setIsSearching(false);
    }
  }, [groupId, navigate, fetchMembers]);

  // 获取群成员列表（初始加载或切换标签时）
  useEffect(() => {
    if (activeTab === 'members' && groupId && !searchQuery.trim()) {
      fetchMembers();
    }
  }, [groupId, activeTab, fetchMembers]);

  // 处理搜索输入变化（防抖）
  useEffect(() => {
    if (activeTab !== 'members' || !groupId) {
      return;
    }

    // 如果搜索关键词为空，不触发搜索（由上面的useEffect处理）
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      searchMembers(searchQuery);
    }, 300); // 300ms防抖

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, groupId, searchMembers]);

  // 清空搜索
  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    fetchMembers();
  };

  // 打开举报模态框
  const handleOpenReportModal = (userId) => {
    setReportingUserId(userId);
    setReportContent('');
    setShowReportModal(true);
  };

  // 关闭举报模态框
  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setReportingUserId(null);
    setReportContent('');
  };

  // 提交举报
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    
    if (!reportContent.trim()) {
      alert('请输入举报内容');
      return;
    }

    if (!reportingUserId || !currentUser) {
      alert('举报信息不完整');
      return;
    }

    setSubmittingReport(true);
    try {
      const userId = currentUser.id || currentUser.userId;
      const reportData = {
        user_id: parseInt(userId, 10),
        report_content: reportContent.trim(),
        reported_user_id: parseInt(reportingUserId, 10),
        group_id: groupId ? parseInt(groupId, 10) : undefined,
      };

      const response = await fetch('http://127.0.0.1:8000/api/reports/', {
        method: 'POST',
        headers: getAuthHeadersWithUserId(),
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        alert('举报已提交，我们会尽快处理');
        handleCloseReportModal();
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '提交举报失败，请稍后重试';
        alert(errorMessage);
        console.error('提交举报失败:', errorData);
      }
    } catch (error) {
      console.error('提交举报时发生错误:', error);
      alert('提交举报时发生错误，请稍后重试');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleBack = () => {
    // 如果URL中有chatId参数，返回时带上该参数
    const chatId = searchParams.get('chatId');
    if (chatId) {
      navigate(`/chat?chatId=${chatId}`);
    } else {
      navigate('/chat');
    }
  };

  const handleApprove = async (requestId) => {
    if (!requestId) {
      alert('无效的申请ID');
      return;
    }

    if (!window.confirm('确定要同意此用户加入群聊吗？')) {
      return;
    }

    setProcessingRequestId(requestId);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/join-requests/${requestId}/audit?action=approve`,
        {
          method: 'POST',
          headers: getAuthHeadersForGroupInfo(),
        }
      );

      if (response.ok) {
        alert('已同意加入');
        // 从列表中移除已处理的申请
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        // 如果当前页没有数据了，且不是第一页，则跳转到上一页
        if (joinRequests.length === 1 && currentPage > 1) {
          setCurrentPage(prev => Math.max(1, prev - 1));
        }
        // 如果当前在成员列表页面，刷新成员列表
        if (activeTab === 'members') {
          fetchMembers();
        }
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '同意加入失败，请稍后重试';
        alert(errorMessage);
        console.error('同意加入失败:', errorData);
      }
    } catch (error) {
      console.error('同意加入时发生错误:', error);
      alert('同意加入时发生错误，请稍后重试');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleReject = async (requestId) => {
    if (!requestId) {
      alert('无效的申请ID');
      return;
    }

    if (!window.confirm('确定要拒绝此用户的加入申请吗？')) {
      return;
    }

    setProcessingRequestId(requestId);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/join-requests/${requestId}/audit?action=reject`,
        {
          method: 'POST',
          headers: getAuthHeadersForGroupInfo(),
        }
      );

      if (response.ok) {
        alert('已拒绝加入');
        // 从列表中移除已处理的申请
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        // 如果当前页没有数据了，且不是第一页，则跳转到上一页
        if (joinRequests.length === 1 && currentPage > 1) {
          setCurrentPage(prev => Math.max(1, prev - 1));
        }
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '拒绝加入失败，请稍后重试';
        alert(errorMessage);
        console.error('拒绝加入失败:', errorData);
      }
    } catch (error) {
      console.error('拒绝加入时发生错误:', error);
      alert('拒绝加入时发生错误，请稍后重试');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'requests') {
      setCurrentPage(1); // 切换标签时重置页码
    } else if (tab === 'members') {
      // 切换到成员列表时，清空搜索并加载所有成员
      setSearchQuery('');
      setIsSearching(false);
    }
  };

  // 转让群主
  const handleTransfer = async (toUserId) => {
    if (!toUserId) {
      alert('无效的用户ID');
      return;
    }

    if (!window.confirm(`确定要将群主身份转让给用户 ${String(toUserId).padStart(10, '0')} 吗？此操作不可撤销！`)) {
      return;
    }

    setProcessingMemberId(toUserId);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/${groupId}/transfer?to_user_id=${toUserId}`,
        {
          method: 'POST',
          headers: getAuthHeadersWithUserId(),
        }
      );

      if (response.ok) {
        alert('群主身份转让成功');
        // 刷新群聊信息
        try {
          const refreshResponse = await fetch(
            `http://127.0.0.1:8000/api/groups/${groupId}`,
            {
              method: 'GET',
              headers: getAuthHeadersForGroupInfo(),
            }
          );
          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            setGroupInfo(data);
          }
        } catch (error) {
          console.error('刷新群聊信息失败:', error);
        }
        // 刷新成员列表
        fetchMembers();
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '转让群主失败，请稍后重试';
        alert(errorMessage);
        console.error('转让群主失败:', errorData);
      }
    } catch (error) {
      console.error('转让群主时发生错误:', error);
      alert('转让群主时发生错误，请稍后重试');
    } finally {
      setProcessingMemberId(null);
    }
  };

  // 踢出成员
  // const handleRemoveMember = async (memberUserId) => {
  //   if (!memberUserId) {
  //     alert('无效的用户ID');
  //     return;
  //   }

  //   if (!window.confirm(`确定要将用户 ${String(memberUserId).padStart(10, '0')} 踢出群聊吗？`)) {
  //     return;
  //   }

  //   setProcessingMemberId(memberUserId);
  //   try {
  //     const response = await fetch(
  //       `http://127.0.0.1:8000/api/groups/${groupId}/members/${memberUserId}`,
  //       {
  //         method: 'DELETE',
  //         headers: getAuthHeadersWithUserId(),
  //       }
  //     );

  //     if (response.ok) {
  //       alert('已踢出成员');
  //       // 刷新成员列表
  //       fetchMembers();
  //     } else {
  //       // 如果是401未授权，清除用户信息并跳转到登录页
  //       if (response.status === 401) {
  //         clearUserInfo();
  //         navigate('/login');
  //         return;
  //       }
        
  //       const errorData = await response.json().catch(() => ({}));
  //       const errorMessage = errorData.message || errorData.detail || errorData.error || '踢出成员失败，请稍后重试';
  //       alert(errorMessage);
  //       console.error('踢出成员失败:', errorData);
  //     }
  //   } catch (error) {
  //     console.error('踢出成员时发生错误:', error);
  //     alert('踢出成员时发生错误，请稍后重试');
  //   } finally {
  //     setProcessingMemberId(null);
  //   }
  // };
  const handleRemoveMember = async (memberUserId) => {
    if (!memberUserId) {
      alert('无效的用户ID');
      return;
    }

    // 防止通过该接口移除自己（自行退出请使用退出按钮）
    const currentUserId = currentUser?.id || currentUser?.userId;
    if (String(memberUserId) === String(currentUserId)) {
      alert('请使用退出群聊功能退出；群主需先转让群主后才能退出。');
      return;
    }

    if (!window.confirm(`确定要将用户 ${String(memberUserId).padStart(10, '0')} 踢出群聊吗？`)) {
      return;
    }

    setProcessingMemberId(memberUserId);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/${groupId}/members/${memberUserId}`,
        {
          method: 'DELETE',
          headers: getAuthHeadersWithUserId(),
        }
      );

      if (response.ok) {
        alert('已踢出成员');
        // 刷新成员列表
        fetchMembers();
      } else {
        // 如果是401未授权，清除用户信息并跳转到登录页
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '踢出成员失败，请稍后重试';
        alert(errorMessage);
        console.error('踢出成员失败:', errorData);
      }
    } catch (error) {
      console.error('踢出成员时发生错误:', error);
      alert('踢出成员时发生错误，请稍后重试');
    } finally {
      setProcessingMemberId(null);
    }
  };

  // 退出群聊（供本人使用；群主需先转让群主后才能退出）
  const handleLeaveGroup = async (memberUserId) => {
    if (!memberUserId) {
      alert('无效的用户ID');
      return;
    }

    const currentUserId = currentUser?.id || currentUser?.userId;
    if (!currentUserId || String(memberUserId) !== String(currentUserId)) {
      alert('只能退出自己的账号');
      return;
    }

    // 如果是群主，阻止退出并提示先转让
    if (isOwner()) {
      alert('您是群主，请先将群主转让给其他成员后再退出群聊。');
      return;
    }

    if (!window.confirm('确定要退出该群聊吗？退出后需要重新申请才能加入。')) {
      return;
    }

    setProcessingMemberId(memberUserId);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/${groupId}/members/${memberUserId}`,
        {
          method: 'DELETE',
          headers: getAuthHeadersWithUserId(),
        }
      );

      if (response.ok) {
        alert('已退出群聊');
        // 退出后返回聊天列表
        const chatId = searchParams.get('chatId');
        if (chatId) {
          navigate(`/chat?chatId=${chatId}`);
        } else {
          navigate('/chat');
        }
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '退出群聊失败，请稍后重试';
        alert(errorMessage);
        console.error('退出群聊失败:', errorData);
      }
    } catch (error) {
      console.error('退出群聊时发生错误:', error);
      alert('退出群聊时发生错误，请稍后重试');
    } finally {
      setProcessingMemberId(null);
    }
  };
  return (
    
    <div className="group-member-container">
      {/* 头部 */}
      <div className="group-member-header">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="group-member-title">群聊成员</h1>
      </div>

      {/* 主体内容 - 左右分栏 */}
      <div className="group-member-body">
        {/* 左侧导航栏 */}
        <div className="group-member-sidebar">
          <button
            className={`sidebar-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => handleTabChange('requests')}
          >
            申请入群列表
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => handleTabChange('members')}
          >
            已加入成员信息
          </button>
        </div>

        {/* 右侧内容区域 */}
        <div className="group-member-content">
          {activeTab === 'requests' && (
            <>
              {joinRequestsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  加载中...
                </div>
              ) : (
                <>
                  {/* 申请加入群聊部分 */}
                  {joinRequests.length > 0 ? (
                    <div className="join-requests-section">
                      <div className="section-label">申请加入群聊:</div>
                      <div className="member-list">
                        {joinRequests.map((request) => {
                          const userId = request.user_id || request.user?.id;
                          // 获取违规记录，可能在不同的字段中
                          const violationCount = request.violation_count || request.violation_records || request.user?.violation_count || 0;
                          const avatarClass = getUserAvatarClass(userId || 0);
                          const requestId = request.id;

                          return (
                            <div key={requestId} className="member-item">
                              <div className={`member-avatar ${avatarClass}`}>
                                <User size={20} />
                              </div>
                              <div className="member-info">
                                <div className="member-id">ID: {userId ? String(userId).padStart(10, '0') : '未知'}</div>
                                <div className="member-violation">违规记录: {violationCount}次</div>
                                {request.reason && (
                                  <div className="member-reason">申请理由: {request.reason}</div>
                                )}
                              </div>
                              <div className="member-actions">
                                <button
                                  className="action-button approve-button"
                                  onClick={() => handleApprove(requestId)}
                                  disabled={processingRequestId === requestId}
                                >
                                  {processingRequestId === requestId ? '处理中...' : '同意加入'}
                                </button>
                                <button
                                  className="action-button reject-button"
                                  onClick={() => handleReject(requestId)}
                                  disabled={processingRequestId === requestId}
                                  title="拒绝"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              {/* <div className="member-actions">
                                  {showActions && (
                                    <>
                                      <button
                                        className="action-button transfer-button"
                                        onClick={() => handleTransfer(userId)}
                                        disabled={processingMemberId === userId}
                                        title="转让群主"
                                      >
                                        {processingMemberId === userId ? '处理中...' : '转让'}
                                      </button>
                                      <button
                                        className="action-button remove-button"
                                        onClick={() => handleRemoveMember(userId)}
                                        disabled={processingMemberId === userId}
                                        title="踢出群聊"
                                      >
                                        {processingMemberId === userId ? '处理中...' : '踢出'}
                                      </button>
                                    </>
                                  )}
                                  {isCurrentUserMember && (
                                    <button
                                      className="action-button leave-button"
                                      onClick={() => handleLeaveGroup(userId)}
                                      disabled={processingMemberId === userId}
                                      title="退出群聊"
                                    >
                                      {processingMemberId === userId ? '处理中...' : '退出'}
                                    </button>
                                  )}
                                  {!isCurrentUserMember && (
                                    <button
                                      className="action-button report-button"
                                      onClick={() => handleOpenReportModal(userId)}
                                      title="举报成员"
                                    >
                                      <Flag size={16} />
                                    </button>
                                  )}
                              </div> */}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">暂无入群申请</div>
                  )}

                  {/* 分页控件 - 只在有数据或多页时显示 */}
                  {(joinRequests.length > 0 || totalPages > 1) && (
                    <div className="pagination">
                      <button
                        className="pagination-button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Newer
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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

                        return (
                          <button
                            key={pageNum}
                            className={`pagination-button ${currentPage === pageNum ? 'active' : ''}`}
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        className="pagination-button"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Older
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'members' && (
            <>
              {/* 群聊成员信息部分 */}
              <div className="members-section">
                <div className="members-header">
                  <div className="section-title">群聊成员信息</div>
                  {/* 搜索框 */}
                  <div className="member-search-container">
                    <div className="member-search-box">
                      <Search size={18} className="search-icon" />
                      <input
                        type="text"
                        className="member-search-input"
                        placeholder="搜索成员（按昵称）"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (searchQuery.trim()) {
                              searchMembers(searchQuery);
                            }
                          }
                        }}
                      />
                      {searchQuery && (
                        <button
                          className="search-clear-button"
                          onClick={handleClearSearch}
                          title="清空搜索"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {membersLoading || isSearching ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    {isSearching ? '搜索中...' : '加载中...'}
                  </div>
                ) : (
                  <>
                    {members.length > 0 ? (
                      <div className="member-list">
                        {members.map((member) => {
                          const userId = member.user_id || member.id || member.user?.id;
                          // 获取昵称，可能在不同的字段中
                          const nickname = member.nickname || member.name || member.user?.nickname || member.user?.name || '';
                          // 获取违规记录，优先使用 approved_report_count 字段
                          const violationCount = member.approved_report_count !== undefined 
                            ? member.approved_report_count 
                            : (member.violation_count || member.violation_records || member.user?.violation_count || 0);
                          const avatarClass = getUserAvatarClass(userId || 0);
                          const isCurrentUserMember = isCurrentUser(userId);
                          const isOwnerUser = isOwner();
                          const showActions = isOwnerUser && !isCurrentUserMember; // 只有群主且不是自己才显示操作按钮

                          return (
                            <div key={member.id || userId} className="member-item">
                              <div className={`member-avatar ${avatarClass}`}>
                                <User size={20} />
                              </div>
                              <div className="member-info">
                                <div className="member-id">
                                  {nickname && <span className="member-nickname">{nickname}</span>}
                                  ID: {userId ? String(userId).padStart(10, '0') : '未知'}
                                  {isCurrentUserMember && <span className="member-tag">（我）</span>}
                                  {isOwnerUser && isCurrentUserMember && <span className="member-tag owner-tag">（群主）</span>}
                                  {!isCurrentUserMember && groupInfo && String(groupInfo.created_by_user_id) === String(userId) && (
                                    <span className="member-tag owner-tag">（群主）</span>
                                  )}
                                </div>
                                <div className="member-violation">违规记录: {violationCount}次</div>
                              </div>
                              {/* <div className="member-actions">
                                {showActions && (
                                  <>
                                    <button
                                      className="action-button transfer-button"
                                      onClick={() => handleTransfer(userId)}
                                      disabled={processingMemberId === userId}
                                      title="转让群主"
                                    >
                                      {processingMemberId === userId ? '处理中...' : '转让'}
                                    </button>
                                    <button
                                      className="action-button remove-button"
                                      onClick={() => handleRemoveMember(userId)}
                                      disabled={processingMemberId === userId}
                                      title="踢出群聊"
                                    >
                                      {processingMemberId === userId ? '处理中...' : '踢出'}
                                    </button>
                                  </>
                                )}                       
                                {!isCurrentUserMember && (
                                  <button
                                    className="action-button report-button"
                                    onClick={() => handleOpenReportModal(userId)}
                                    title="举报成员"
                                  >
                                    <Flag size={16} />
                                  </button>
                                  
                                )}
                              </div> */}
                              <div className="member-actions">
                                  {showActions && (
                                    <>
                                      <button
                                        className="action-button transfer-button"
                                        onClick={() => handleTransfer(userId)}
                                        disabled={processingMemberId === userId}
                                        title="转让群主"
                                      >
                                        {processingMemberId === userId ? '处理中...' : '转让'}
                                      </button>
                                      <button
                                        className="action-button remove-button"
                                        onClick={() => handleRemoveMember(userId)}
                                        disabled={processingMemberId === userId}
                                        title="踢出群聊"
                                      >
                                        {processingMemberId === userId ? '处理中...' : '踢出'}
                                      </button>
                                    </>
                                  )}
                                  {isCurrentUserMember && (
                                    <button
                                      className="action-button leave-button"
                                      onClick={() => handleLeaveGroup(userId)}
                                      disabled={processingMemberId === userId}
                                      title="退出群聊"
                                    >
                                      {processingMemberId === userId ? '处理中...' : '退出'}
                                    </button>
                                  )}
                                  {!isCurrentUserMember && (
                                    <button
                                      className="action-button report-button"
                                      onClick={() => handleOpenReportModal(userId)}
                                      title="举报成员"
                                    >
                                      <Flag size={16} />
                                    </button>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state">
                        {searchQuery ? `未找到昵称包含"${searchQuery}"的成员` : '暂无成员信息'}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 举报模态框 */}
      {showReportModal && (
        <div className="modal-overlay" onClick={handleCloseReportModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">举报成员</h3>
              <button className="modal-close" onClick={handleCloseReportModal}>
                <X size={20} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSubmitReport}>
              <div className="form-group">
                <label className="form-label">被举报用户ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={reportingUserId ? String(reportingUserId).padStart(10, '0') : ''}
                  disabled
                />
              </div>
              <div className="form-group">
                <label className="form-label">举报原因</label>
                <textarea
                  className="form-textarea"
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  placeholder="请详细描述举报原因..."
                  rows={5}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-button cancel-button"
                  onClick={handleCloseReportModal}
                  disabled={submittingReport}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="modal-button confirm-button"
                  disabled={submittingReport}
                >
                  {submittingReport ? '提交中...' : '提交举报'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupMemberManagement;

