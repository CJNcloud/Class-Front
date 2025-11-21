// 用户信息存储工具

const USER_STORAGE_KEY = 'userInfo';

/**
 * 保存用户信息到 localStorage
 * @param {Object} userInfo - 用户信息对象
 */
export const saveUserInfo = (userInfo) => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
  } catch (error) {
    console.error('保存用户信息失败:', error);
  }
};

/**
 * 从 localStorage 获取用户信息
 * @returns {Object|null} 用户信息对象，如果不存在则返回 null
 */
export const getUserInfo = () => {
  try {
    const userInfo = localStorage.getItem(USER_STORAGE_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
};

/**
 * 检查用户是否为管理员
 * @returns {boolean} 如果是管理员返回 true，否则返回 false
 */
export const isAdmin = () => {
  const userInfo = getUserInfo();
  return userInfo && userInfo.role === 'admin';
};

/**
 * 清除用户信息
 */
export const clearUserInfo = () => {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error('清除用户信息失败:', error);
  }
};

/**
 * 获取认证token
 * @returns {string|null} token字符串，如果不存在则返回 null
 */
export const getToken = () => {
  const userInfo = getUserInfo();
  return userInfo?.token || userInfo?.access_token || null;
};

/**
 * 获取认证请求头
 * @returns {Object} 包含Authorization头的对象
 */
export const getAuthHeaders = () => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * 获取带用户ID的认证请求头（用于置顶等需要X-User-Id的操作）
 * @returns {Object} 包含Authorization头和X-User-Id头的对象
 */
export const getAuthHeadersWithUserId = () => {
  const token = getToken();
  const userInfo = getUserInfo();
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 添加X-User-Id头
  const userId = userInfo?.id || userInfo?.userId;
  if (userId) {
    headers['X-User-Id'] = userId.toString();
  }
  
  return headers;
};

/**
 * 获取带用户ID或管理员Token的认证请求头（用于解散群聊等操作）
 * 如果是管理员，使用X-Admin-Token；否则使用X-User-Id
 * @returns {Object} 包含Authorization头和X-User-Id或X-Admin-Token头的对象
 */
export const getAuthHeadersForGroupOperation = () => {
  const token = getToken();
  const userInfo = getUserInfo();
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 如果是管理员，使用X-Admin-Token；否则使用X-User-Id
  if (isAdmin() && token) {
    headers['X-Admin-Token'] = token;
  } else {
    const userId = userInfo?.id || userInfo?.userId;
    if (userId) {
      headers['X-User-Id'] = userId.toString();
    }
  }
  
  return headers;
};

/**
 * 获取管理员Token认证请求头（用于审核修改群聊信息等操作）
 * @returns {Object} 包含X-Admin-Token头的对象
 */
export const getAuthHeadersWithAdminToken = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // 根据接口文档，使用固定的 dev-admin 作为 X-Admin-Token
  headers['X-Admin-Token'] = 'dev-admin';
  
  return headers;
};

/**
 * 获取用于查看群聊信息的认证请求头（支持X-User-Id或X-Admin-Token）
 * 群主或管理员可以查看入群申请列表
 * @returns {Object} 包含Authorization头和X-User-Id或X-Admin-Token头的对象
 */
export const getAuthHeadersForGroupInfo = () => {
  const token = getToken();
  const userInfo = getUserInfo();
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 如果是管理员，使用X-Admin-Token；否则使用X-User-Id
  if (isAdmin() && token) {
    headers['X-Admin-Token'] = token;
  } else {
    const userId = userInfo?.id || userInfo?.userId;
    if (userId) {
      headers['X-User-Id'] = userId.toString();
    }
  }
  
  return headers;
};

