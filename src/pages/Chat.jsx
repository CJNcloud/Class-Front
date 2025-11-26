import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Plus, MessageSquare, Users, Settings, Smile, Folder, Scissors, Mic, Send, Volume2, Flag, X, Search, RotateCcw, Trash2 } from 'lucide-react';
import GroupChatList from '../components/GroupChatList';
import GroupActionModal from '../components/GroupActionModal';
import { getUserInfo, isAdmin, getAuthHeadersWithUserId, clearUserInfo, getAuthHeaders } from '../utils/userStorage';
import { filterHiddenMessages, hideMessage, clearGroupMessages, isGroupCleared } from '../utils/messageStorage';
import './Chat.css';

const Chat = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChatId, setSelectedChatId] = useState(() => {
    // 从 URL 参数中获取群聊ID，如果没有则返回 null
    const chatId = searchParams.get('chatId');
    return chatId ? parseInt(chatId, 10) : null;
  });
  const [userInfo, setUserInfo] = useState(null);
  const [groupChats, setGroupChats] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false); // 是否显示举报群聊模态框
  const [reportContent, setReportContent] = useState(''); // 举报内容
  const [submittingReport, setSubmittingReport] = useState(false); // 是否正在提交举报
  // 消息相关状态
  const [messages, setMessages] = useState([]); // 消息列表
  const [loadingMessages, setLoadingMessages] = useState(false); // 加载消息中
  const [sendingMessage, setSendingMessage] = useState(false); // 发送消息中
  const [messageContent, setMessageContent] = useState(''); // 消息输入框内容
  const [searchQuery, setSearchQuery] = useState(''); // 搜索关键词
  const [isSearching, setIsSearching] = useState(false); // 是否正在搜索
  const searchQueryRef = useRef(''); // 搜索关键词引用（用于WebSocket消息处理）
  const isSearchingRef = useRef(false); // 搜索状态引用（用于WebSocket消息处理）
  const [skip, setSkip] = useState(0); // 分页偏移
  const [hasMore, setHasMore] = useState(true); // 是否还有更多消息
  const [groupInfo, setGroupInfo] = useState(null); // 群聊详细信息（包括群主ID）
  const [retractingMessageId, setRetractingMessageId] = useState(null); // 正在撤回的消息ID
  const [deletingMessageId, setDeletingMessageId] = useState(null); // 正在删除的消息ID
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false); // 是否显示清空确认模态框
  const messagesEndRef = useRef(null); // 消息列表底部引用
  const messagesContainerRef = useRef(null); // 消息容器引用
  const wsRef = useRef(null); // WebSocket连接引用
  const reconnectTimeoutRef = useRef(null); // 重连定时器引用
  const [wsConnected, setWsConnected] = useState(false); // WebSocket连接状态
  const groupInfoRef = useRef(groupInfo);
  const userInfoRef = useRef(userInfo);
  useEffect(() => {
    // 检查用户是否为管理员，如果是则重定向到管理员页面
    if (isAdmin()) {
      navigate('/admin');
      return;
    }
    // 从 localStorage 获取用户信息
    const user = getUserInfo();
    setUserInfo(user);
    console.log(user);
  }, [navigate]);
  useEffect(() => {
    console.log(messages);
  }, [messages]);
  // 获取群聊详细信息（包括群主ID）
  useEffect(() => {
    if (!selectedChatId) {
      setGroupInfo(null);
      return;
    }

    const fetchGroupInfo = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/groups/${selectedChatId}`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          setGroupInfo(data);
        } else {
          console.error('获取群聊信息失败');
        }
      } catch (error) {
        console.error('获取群聊信息时发生错误:', error);
      }
    };

    fetchGroupInfo();
  }, [selectedChatId]);
useEffect(() => { groupInfoRef.current = groupInfo; }, [groupInfo]);
  useEffect(() => { userInfoRef.current = userInfo; }, [userInfo]);
  // 格式化时间显示
  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) {
        return '刚刚';
      } else if (minutes < 60) {
        return `${minutes}分钟前`;
      } else if (hours < 24) {
        return `${hours}小时前`;
      } else if (days < 7) {
        return `${days}天前`;
      } else {
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    } catch (error) {
      return '';
    }
  };

  // 判断用户是否是群主
  const isGroupOwner = () => {
    if (!groupInfo || !userInfo) return false;
    const ownerId = groupInfo.created_by_user_id;
    const userId = userInfo.id || userInfo.userId;
    // console.log('ownerId',ownerId,'userId',userId);
    const isOwner = ownerId && userId && String(ownerId) === String(userId);
    // console.log('isOwner',isOwner);
    return isOwner;
  };

  // 判断消息是否可以撤回（2分钟内或群主）
  const canRetractMessage = (message) => {
    if (!message || !userInfo) return false;
    const userId = userInfo.id || userInfo.userId;
    const isSender = message.user_id && userId && String(message.user_id) === String(userId);
    
    if (isGroupOwner()) {
      return true; // 群主可以随时撤回
    }
    
    if (!isSender) {
      return false; // 不是发送者不能撤回
    }
    
    // 检查是否在2分钟内
    if (!message.sent_at) return false;
    try {
      const sentTime = new Date(message.sent_at);
      const now = new Date();
      const diffMinutes = (now - sentTime) / 60000;
      return diffMinutes <= 2;
    } catch (error) {
      return false;
    }
  };


  // 当选中群聊改变时，重新加载消息
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setGroupInfo(null);
      return;
    }

    // 重置状态
    setMessages([]);
    setSkip(0);
    setHasMore(true);
    setSearchQuery('');
    searchQueryRef.current = '';
    setIsSearching(false);
    isSearchingRef.current = false;

    // 加载消息
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const limit = 50;
        const url = `http://127.0.0.1:8000/api/groups/${selectedChatId}/chats/?skip=0&limit=${limit}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: getAuthHeadersWithUserId(),
        });

        if (response.ok) {
          const data = await response.json();
          const newMessages = Array.isArray(data) ? data : [];
          
          // 使用更新后的filterHiddenMessages函数处理消息过滤
          // 该函数现在会基于清空时间戳和隐藏ID列表自动处理消息过滤
          const filteredMessages = filterHiddenMessages(selectedChatId, newMessages);
          setMessages(filteredMessages);
          
          setSkip(newMessages.length);
          setHasMore(newMessages.length === limit);
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        } else {
          if (response.status === 401) {
            clearUserInfo();
            navigate('/login');
            return;
          }
          console.error('获取消息列表失败');
        }
      } catch (error) {
        console.error('获取消息列表时发生错误:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedChatId, navigate]);


  // 发送消息
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!selectedChatId || !messageContent.trim() || sendingMessage) return;
    
    const currentUser = getUserInfo();
    const userId = currentUser?.id || currentUser?.userId;
    
    if (!userId) {
      alert('无法获取用户信息，请重新登录');
      return;
    }

    setSendingMessage(true);
    try {
      const messageData = {
        user_id: parseInt(userId, 10),
        sender_name: currentUser?.username || '用户',
        content: messageContent.trim(),
        // 不提供chat_no，让服务器自动生成
      };

      const response = await fetch(`http://127.0.0.1:8000/api/groups/${selectedChatId}/chats/`, {
        method: 'POST',
        headers: getAuthHeadersWithUserId(),
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessageContent('');
        
        // 由于WebSocket推送可能会有延迟，这里先添加消息
        // WebSocket推送时会有去重逻辑，所以不会重复显示
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (!exists) {
            return [...prev, newMessage];
          }
          return prev;
        });
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '发送消息失败，请稍后重试';
        alert(errorMessage);
        console.error('发送消息失败:', errorData);
      }
    } catch (error) {
      console.error('发送消息时发生错误:', error);
      alert('发送消息时发生错误，请稍后重试');
    } finally {
      setSendingMessage(false);
    }
  };

  // 判断消息发送者是否是群主
  const isMessageSenderOwner = (message) => {
    if (!message || !groupInfo) return false;
    const ownerId = groupInfo.created_by_user_id;
    const senderId = message.user_id;
    return ownerId && senderId && String(ownerId) === String(senderId);
  };

  // 生成撤回提示消息
  const createRetractNotice = (retractedMessage, retractorName, isRetractorOwner) => {
    console.log('retractedMessage',retractedMessage);
    const isSenderOwner = isMessageSenderOwner(retractedMessage);
    const senderName = retractedMessage.sender_name || '用户';
    
    let noticeText = '';
    console.log(isRetractorOwner, isSenderOwner);
    console.log('hao',isRetractorOwner && (!isSenderOwner));
    if (isRetractorOwner && (!isSenderOwner)) {
      // 群主撤回非群主的消息
      noticeText = `撤回了一条消息`;
    } else {
      // 普通撤回
      noticeText = `撤回了一条消息`;
    }
    
    return {
      id: `retract_${retractedMessage.id}_${Date.now()}`,
      chat_no: retractedMessage.chat_no,
      group_id: retractedMessage.group_id,
      user_id: retractedMessage.user_id,
      sender_name: '系统',
      content: noticeText,
      sent_at: new Date().toISOString(),
      is_retract_notice: true, // 标记为撤回提示消息
      retracted_message_id: retractedMessage.id
    };
  };

  // 删除单条消息（仅对当前用户隐藏）
  const handleDeleteMessage = (messageId) => {
    if (!selectedChatId || !messageId || deletingMessageId) return;
    
    setDeletingMessageId(messageId);
    try {
      // 隐藏该消息
      hideMessage(selectedChatId, messageId);
      
      // 从消息列表中移除
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('删除消息时发生错误:', error);
      alert('删除消息时发生错误，请稍后重试');
    } finally {
      setDeletingMessageId(null);
    }
  };

  // 清空群聊记录（仅对当前用户）
  const handleClearGroupMessages = () => {
    if (!selectedChatId) return;
    
    if (window.confirm('确定要清空该群聊的所有聊天记录吗？此操作仅影响您的视图，其他用户不会受到影响。')) {
      try {
        // 获取当前所有消息的ID
        const currentMessageIds = messages.map(msg => msg.id);
        
        // 清空群聊记录（传入当前所有消息ID）
        clearGroupMessages(selectedChatId, currentMessageIds);
        
        // 清空消息列表
        setMessages([]);
        setSkip(0);
        setHasMore(false);
        
        alert('已清空该群聊的聊天记录');
      } catch (error) {
        console.error('清空群聊记录时发生错误:', error);
        alert('清空群聊记录时发生错误，请稍后重试');
      }
    }
  };

  // 撤回消息
  const handleRetractMessage = async (messageId) => {
    if (!selectedChatId || !messageId || retractingMessageId) return;

    // 找到要撤回的消息
    const messageToRetract = messages.find(msg => msg.id === messageId);
    if (!messageToRetract) return;

    setRetractingMessageId(messageId);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/groups/${selectedChatId}/chats/${messageId}`, {
        method: 'DELETE',
        headers: getAuthHeadersWithUserId(),
      });

      if (response.ok) {
        console.log('消息撤回成功');
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || errorData.error || '撤回消息失败，请稍后重试';
        alert(errorMessage);
        console.error('撤回消息失败:', errorData);
      }
    } catch (error) {
      console.error('撤回消息时发生错误:', error);
      alert('撤回消息时发生错误，请稍后重试');
    } finally {
      setRetractingMessageId(null);
    }
  };

  // 搜索消息
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!selectedChatId) return;
    
    const query = searchQuery.trim();
    searchQueryRef.current = query;
    setIsSearching(true);
    isSearchingRef.current = true;
    setSkip(0);
    setHasMore(true);
    setMessages([]);
    
    // 使用新的搜索关键词获取消息
    setLoadingMessages(true);
    try {
      const limit = 50;
      let url = `http://127.0.0.1:8000/api/groups/${selectedChatId}/chats/?skip=0&limit=${limit}`;
      
      if (query) {
        url += `&q=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeadersWithUserId(),
      });

      if (response.ok) {
        const data = await response.json();
        const newMessages = Array.isArray(data) ? data : [];
        // 过滤掉隐藏的消息
        const filteredMessages = filterHiddenMessages(selectedChatId, newMessages);
        setMessages(filteredMessages);
        setSkip(newMessages.length);
        setHasMore(newMessages.length === limit);
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        console.error('搜索消息失败');
      }
    } catch (error) {
      console.error('搜索消息时发生错误:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 清除搜索
  const handleClearSearch = async () => {
    setSearchQuery('');
    searchQueryRef.current = '';
    setIsSearching(false);
    isSearchingRef.current = false;
    setSkip(0);
    setHasMore(true);
    setMessages([]);
    
    // 重新加载所有消息
    setLoadingMessages(true);
    try {
      const limit = 50;
      const url = `http://127.0.0.1:8000/api/groups/${selectedChatId}/chats/?skip=0&limit=${limit}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeadersWithUserId(),
      });

      if (response.ok) {
        const data = await response.json();
        const newMessages = Array.isArray(data) ? data : [];
        // 过滤掉隐藏的消息
        const filteredMessages = filterHiddenMessages(selectedChatId, newMessages);
        setMessages(filteredMessages);
        setSkip(newMessages.length);
        setHasMore(newMessages.length === limit);
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        // 清除搜索后，重新建立WebSocket连接
        if (selectedChatId) {
          setTimeout(() => {
            connectWebSocket(selectedChatId);
          }, 500);
        }
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        console.error('获取消息列表失败');
      }
    } catch (error) {
      console.error('获取消息列表时发生错误:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 加载更多消息
  const handleLoadMore = async () => {
    if (loadingMessages || !hasMore || !selectedChatId) return;

    setLoadingMessages(true);
    try {
      const limit = 50;
      let url = `http://127.0.0.1:8000/api/groups/${selectedChatId}/chats/?skip=${skip}&limit=${limit}`;
      
      if (searchQuery.trim()) {
        url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeadersWithUserId(),
      });

      if (response.ok) {
        const data = await response.json();
        const newMessages = Array.isArray(data) ? data : [];
        
        // 使用更新后的filterHiddenMessages函数处理消息过滤
        // 该函数现在会基于清空时间戳和隐藏ID列表自动处理消息过滤
        const filteredMessages = filterHiddenMessages(selectedChatId, newMessages);
        setMessages(prev => [...prev, ...filteredMessages]);
        
        setSkip(prev => prev + newMessages.length);
        setHasMore(newMessages.length === limit);
      } else {
        if (response.status === 401) {
          clearUserInfo();
          navigate('/login');
          return;
        }
        console.error('加载更多消息失败');
      }
    } catch (error) {
      console.error('加载更多消息时发生错误:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 根据用户ID生成头像样式
  const getUserAvatarClass = (userId) => {
    const avatarClasses = ['message-avatar-green', 'message-avatar-pink', 'message-avatar-blue', 'message-avatar-purple', 'message-avatar-orange'];
    const index = userId % avatarClasses.length;
    return avatarClasses[index] || 'message-avatar-green';
  };

  // 关闭WebSocket连接
  const closeWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setWsConnected(false);
  };

  // 建立WebSocket连接
  const connectWebSocket = (groupId) => {
    // 如果已经有连接，先关闭
    closeWebSocket();

    if (!groupId) {
      return;
    }

    try {
      // 构建WebSocket URL
      const wsUrl = `ws://127.0.0.1:8000/api/groups/${groupId}/chats/ws`;
      console.log('正在连接WebSocket:', wsUrl);

      // 创建WebSocket连接
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // 连接打开
      ws.onopen = () => {
        console.log('WebSocket连接已建立');
        setWsConnected(true);
      };

      // 接收消息
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('收到WebSocket消息:', message);

          // 处理不同类型的事件
          if (message.event === 'message') {
            // 新消息事件
            const newMessage = message.data;
            if (newMessage && newMessage.id) {
              // 检查消息是否已经存在（避免重复添加）
              setMessages(prev => {
                const exists = prev.some(msg => msg.id === newMessage.id);
                if (exists) {
                  return prev;
                }
                
                // 如果正在搜索，且消息不匹配搜索关键词，不添加
                if (isSearchingRef.current && searchQueryRef.current.trim()) {
                  const query = searchQueryRef.current.trim().toLowerCase();
                  const content = (newMessage.content || '').toLowerCase();
                  if (!content.includes(query)) {
                    return prev;
                  }
                }
                
                // 使用更新后的filterHiddenMessages函数处理新消息
                // 该函数会基于清空时间戳和隐藏ID列表自动处理消息过滤
                // 由于我们只有一条消息，创建一个临时数组来应用过滤
                const filteredMessages = filterHiddenMessages(selectedChatId, [newMessage]);
                
                // 如果消息被过滤掉（返回空数组），则不添加
                if (filteredMessages.length === 0) {
                  return prev;
                }
                
                // 添加新消息
                return [...prev, newMessage];
              });
              
              // 如果不在搜索状态，滚动到底部
              if (!isSearchingRef.current) {
                setTimeout(() => {
                  scrollToBottom();
                }, 100);
              }
            }
          } else if (message.event === 'retracted') {
            // 撤回消息事件
            const { message_id, retractor_name, retractor_id } = message.data;
            if (message_id) {
              setMessages(prev => {
                // 找到被撤回的消息
                const retractedMessage = prev.find(msg => msg.id === message_id);
                if (!retractedMessage) {
                  return prev;
                }
                const currentGroupInfo = groupInfoRef.current;
                const currentUserInfo = userInfoRef.current;
                const retractorUserId = retractor_id || (currentUserInfo?.id || currentUserInfo?.userId);
                // 确保始终为布尔值，避免 groupInfo 为 null 时得到 null
                console.log('groupInfo',groupInfo,'retractorUserId1',retractorUserId);
                const isRetractorOwner = Boolean(
                  currentGroupInfo &&
                  retractorUserId &&
                  String(currentGroupInfo.created_by_user_id) === String(retractorUserId)
              );
                
                // 生成撤回提示消息
                const retractorName = retractor_name || '用户';
                console.log('isRetractorOwner撤回',isRetractorOwner);
                const retractNotice = createRetractNotice(retractedMessage, retractorName, isRetractorOwner);
                
                // 替换原消息为撤回提示
                return prev.map(msg => 
                  msg.id === message_id ? retractNotice : msg
                );
              });
            }
          }
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };

      // 连接错误
      ws.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
        setWsConnected(false);
      };

      // 连接关闭
      ws.onclose = (event) => {
        console.log('WebSocket连接已关闭', event.code, event.reason);
        setWsConnected(false);
        wsRef.current = null;

        // 如果不是正常关闭（code !== 1000），尝试重连
        if (event.code !== 1000 && selectedChatId === groupId) {
          console.log('WebSocket异常关闭，5秒后尝试重连...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (selectedChatId === groupId) {
              connectWebSocket(groupId);
            }
          }, 5000);
        }
      };
    } catch (error) {
      console.error('建立WebSocket连接失败:', error);
      setWsConnected(false);
    }
  };

  // 当选中群聊改变时，建立WebSocket连接
  useEffect(() => {
    if (selectedChatId && !isSearching) {
      // 延迟一下，确保消息列表已加载
      const timer = setTimeout(() => {
        connectWebSocket(selectedChatId);
      }, 500);

      return () => {
        clearTimeout(timer);
        closeWebSocket();
      };
    } else {
      closeWebSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId, isSearching]);

  // 组件卸载时关闭WebSocket连接
  useEffect(() => {
    return () => {
      closeWebSocket();
    };
  }, []);

  // 当群聊列表加载完成后，验证URL参数中的chatId是否存在
  useEffect(() => {
    const chatIdParam = searchParams.get('chatId');
    
    if (!chatIdParam) {
      return;
    }

    const parsedId = parseInt(chatIdParam, 10);
    if (isNaN(parsedId)) {
      return;
    }

    if (groupChats.length > 0) {
      // 列表已加载，验证群聊是否存在
      const chatExists = groupChats.some(chat => chat.id === parsedId);
      if (chatExists) {
        // 如果群聊存在，确保选中状态正确（只在状态不一致时更新，避免无限循环）
        setSelectedChatId(prevId => prevId !== parsedId ? parsedId : prevId);
      } else {
        // 如果群聊不存在，清除URL参数和选中状态
        setSearchParams({});
        setSelectedChatId(null);
      }
    } else {
      // 列表还没加载，先设置选中状态（等列表加载后会自动验证）
      setSelectedChatId(prevId => prevId !== parsedId ? parsedId : prevId);
    }
  }, [groupChats, searchParams, setSearchParams]);

  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
    // 更新 URL 参数
    setSearchParams({ chatId: chatId.toString() });
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleCreateGroup = () => {
    setIsModalOpen(false);
    navigate('/create-group');
  };

  const handleJoinGroup = () => {
    setIsModalOpen(false);
    navigate('/join-group');
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleEditGroup = () => {
    if (selectedChatId) {
      navigate(`/edit-group/${selectedChatId}`);
    }
  };

  const handleViewGroupMembers = () => {
    if (selectedChatId) {
      navigate(`/group-members/${selectedChatId}?chatId=${selectedChatId}`);
    }
  };

  const handleOpenReportGroupModal = () => {
    setReportContent('');
    setShowReportModal(true);
  };

  const handleCloseReportGroupModal = () => {
    setShowReportModal(false);
    setReportContent('');
  };

  const handleSubmitGroupReport = async (e) => {
    e.preventDefault();
    
    if (!reportContent.trim()) {
      alert('请输入举报内容');
      return;
    }

    if (!selectedChatId || !userInfo) {
      alert('举报信息不完整');
      return;
    }

    setSubmittingReport(true);
    try {
      const currentUser = getUserInfo();
      const userId = currentUser?.id || currentUser?.userId;
      
      if (!userId) {
        alert('无法获取用户信息，请重新登录');
        return;
      }
      
      const reportData = {
        user_id: parseInt(userId, 10),
        report_content: reportContent.trim(),
        group_id: parseInt(selectedChatId, 10),
      };

      const response = await fetch('http://127.0.0.1:8000/api/reports/', {
        method: 'POST',
        headers: getAuthHeadersWithUserId(),
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        alert('举报已提交，我们会尽快处理');
        handleCloseReportGroupModal();
      } else {
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

  return (
    <div className="chat-container">
      {/* 左侧边栏 */}
      <div className="chat-sidebar">
        {/* 固定顶部用户信息 */}
        <div className="chat-user-profile" onClick={handleProfileClick}>
          <div className="user-avatar user-avatar-pink">
            <User size={24} />
          </div>
          <span className="user-name">{userInfo?.username || '用户001'}</span>
        </div>

        {/* 您的群聊标题和添加按钮 */}
        <div className="group-chat-header">
          <h2 className="group-chat-title">您的群聊</h2>
          <button className="add-group-button" onClick={handleOpenModal}>
            <Plus size={20} />
          </button>
        </div>

        {/* 群聊列表组件 */}
        <GroupChatList 
          selectedChatId={selectedChatId}
          onChatSelect={handleChatSelect}
          onGroupChatsLoaded={setGroupChats}
          userId={getUserInfo().userId || null}
        />

        {/* 底部导航栏 */}
        <div className="chat-bottom-nav">
          <div className="nav-item">
            <MessageSquare size={20} />
            <span>消息</span>
          </div>
          <div className="nav-item active">
            <Users size={20} />
            <span>群聊</span>
          </div>
          <div className="nav-item">
            <Settings size={20} />
            <span>系统</span>
          </div>
        </div>
      </div>

      {/* 右侧聊天区域 */}
      {selectedChatId && (() => {
        const selectedChat = groupChats.find(chat => chat.id === selectedChatId);
        return (
          <div className="chat-main">
            <div className="chat-divider"></div>
            <div className="chat-content">
              {/* 聊天头部 - 包含编辑按钮和查看成员按钮 */}
              <div className="chat-header">
                <div className="chat-header-left">
                  <h3 className="chat-title">
                    {selectedChat ? selectedChat.name : '群聊'}
                    {wsConnected && (
                      <span className="ws-status ws-status-connected" title="实时连接已建立">
                        ●
                      </span>
                    )}
                    {!wsConnected && selectedChatId && (
                      <span className="ws-status ws-status-disconnected" title="实时连接已断开">
                        ○
                      </span>
                    )}
                  </h3>
                </div>
                <div className="chat-header-actions">
                  <button className="edit-group-button" onClick={handleClearGroupMessages} title="清空聊天记录">
                    <Trash2 size={20} color="#666" />
                  </button>
                  <button className="edit-group-button" onClick={handleViewGroupMembers} title="查看群成员">
                    <Users size={20} color="#666" />
                  </button>
                  <button className="edit-group-button" onClick={handleEditGroup} title="编辑群聊">
                    <Settings size={20} color="#666" />
                  </button>
                  <button className="edit-group-button" onClick={handleOpenReportGroupModal} title="举报群聊">
                    <Flag size={20} color="#666" />
                  </button>
                </div>
              </div>

              {/* 群聊信息区域 - 显示公告和群聊类型 */}
              {selectedChat && (
                <div className="chat-info-panel">
                  <div className="chat-info-section">
                    <div className="chat-info-label">群聊类型</div>
                    <div className="chat-info-value">
                      <span className="chat-group-type-badge">{selectedChat.group_type || '未知类型'}</span>
                    </div>
                  </div>
                  {selectedChat.announce && (
                    <div className="chat-info-section">
                      <div className="chat-info-label">公告</div>
                      <div className="chat-info-value">
                        <div className="chat-announcement-text">{selectedChat.announce}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 搜索框 */}
              <div className="chat-search-bar">
                <form onSubmit={handleSearch} className="chat-search-form">
                  <input
                    type="text"
                    className="chat-search-input"
                    placeholder="搜索消息..."
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchQuery(value);
                      searchQueryRef.current = value;
                    }}
                  />
                  <button type="submit" className="chat-search-button" title="搜索">
                    <Search size={18} />
                  </button>
                  {isSearching && (
                    <button type="button" className="chat-search-clear" onClick={handleClearSearch} title="清除搜索">
                      <X size={18} />
                    </button>
                  )}
                </form>
              </div>

              {/* 消息列表区域 */}
              <div className="chat-messages" ref={messagesContainerRef}>
                {/* 加载更多按钮 */}
                {hasMore && messages.length > 0 && (
                  <div className="load-more-container">
                    <button className="load-more-button" onClick={handleLoadMore} disabled={loadingMessages}>
                      {loadingMessages ? '加载中...' : '加载更多消息'}
                    </button>
                  </div>
                )}

                {/* 加载中提示 */}
                {loadingMessages && messages.length === 0 && (
                  <div className="messages-loading">
                    <div>加载消息中...</div>
                  </div>
                )}

                {/* 无消息提示 */}
                {!loadingMessages && messages.length === 0 && !isSearching && (
                  <div className="messages-empty">
                    <div>暂无消息，开始聊天吧！</div>
                  </div>
                )}

                {/* 搜索无结果提示 */}
                {!loadingMessages && messages.length === 0 && isSearching && (
                  <div className="messages-empty">
                    <div>未找到相关消息</div>
                  </div>
                )}

                {/* 消息列表 */}
                {messages.map((message) => {
                  const userId = userInfo?.id || userInfo?.userId;
                  const isOwnMessage = message.user_id && userId && String(message.user_id) === String(userId);
                  const avatarClass = getUserAvatarClass(message.user_id);
                  const isRetractNotice = message.is_retract_notice; // 是否是撤回提示消息
                  const canRetract = !isRetractNotice && canRetractMessage(message);
                  
                  return (
                    <div key={message.id} className={`message-item ${isOwnMessage ? 'own-message' : ''} ${isRetractNotice ? 'retract-notice' : ''}`}>
                      <div className={`message-avatar ${avatarClass}`}>
                        <User size={20} />
                      </div>
                      <div className="message-content">
                        <div className="message-header">
                          <span className="message-user-name">{message.sender_name || '用户'}</span>
                          <span className="message-time">{formatTime(message.sent_at)}</span>
                        </div>
                        <div className="message-bubble-wrapper">
                          <div className={`message-bubble ${isRetractNotice ? 'message-bubble-notice' : ''}`}>
                            {message.content}
                          </div>
                          <div className="message-actions">
                            {canRetract && (
                              <button
                                className="message-action-button"
                                onClick={() => handleRetractMessage(message.id)}
                                disabled={retractingMessageId === message.id}
                                title={retractingMessageId === message.id ? '撤回中...' : '撤回消息'}
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                            {!isRetractNotice && (
                              <button
                                className="message-action-button"
                                onClick={() => handleDeleteMessage(message.id)}
                                disabled={deletingMessageId === message.id}
                                title={deletingMessageId === message.id ? '删除中...' : '删除消息（仅自己可见）'}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

            {/* 输入区域 */}
            <div className="chat-input-area">
              <div className="chat-input-toolbar">
                <button type="button" className="toolbar-button" title="表情">
                  <Smile size={20} color="#666" />
                </button>
                <button type="button" className="toolbar-button" title="文件">
                  <Folder size={20} color="#666" />
                </button>
                <button type="button" className="toolbar-button" title="截图">
                  <Scissors size={20} color="#666" />
                </button>
                <button type="button" className="toolbar-button" title="语音">
                  <Mic size={20} color="#666" />
                </button>
              </div>
              <form onSubmit={handleSendMessage} className="chat-input-form">
                <input 
                  type="text" 
                  className="chat-input" 
                  placeholder="输入消息..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  disabled={sendingMessage}
                />
                <button type="submit" className="send-button" disabled={sendingMessage || !messageContent.trim()}>
                  <Send size={18} />
                  {sendingMessage ? '发送中...' : '发送'}
                </button>
              </form>
            </div>
          </div>
        </div>
        );
      })()}

      {/* 群聊操作弹窗 */}
      <GroupActionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreateGroup={handleCreateGroup}
        onJoinGroup={handleJoinGroup}
      />

      {/* 举报群聊模态框 */}
      {showReportModal && (
        <div className="modal-overlay" onClick={handleCloseReportGroupModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">举报群聊</h3>
              <button className="modal-close" onClick={handleCloseReportGroupModal}>
                <X size={20} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSubmitGroupReport}>
              <div className="form-group">
                <label className="form-label">群聊ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedChatId ? String(selectedChatId) : ''}
                  disabled
                />
              </div>
              <div className="form-group">
                <label className="form-label">群聊名称</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedChatId ? (groupChats.find(chat => chat.id === selectedChatId)?.name || '') : ''}
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
                  onClick={handleCloseReportGroupModal}
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

export default Chat;

