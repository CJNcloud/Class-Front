// 用户消息隐藏存储工具
// 用于存储用户本地隐藏的消息和清空的群聊记录

const HIDDEN_MESSAGES_KEY = 'hiddenMessages';
const CLEARED_GROUPS_KEY = 'clearedGroups';

/**
 * 获取当前用户ID
 * @returns {string|null} 用户ID
 */
const getCurrentUserId = () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
    return userInfo?.id || userInfo?.userId || null;
  } catch (error) {
    console.error('获取用户ID失败:', error);
    return null;
  }
};

/**
 * 获取用户特定的存储键
 * @param {string} baseKey - 基础键名
 * @returns {string} 用户特定的键名
 */
const getUserSpecificKey = (baseKey) => {
  const userId = getCurrentUserId();
  return userId ? `${baseKey}_${userId}` : baseKey;
};

/**
 * 隐藏一条消息（仅对当前用户隐藏）
 * @param {number} groupId - 群聊ID
 * @param {number} messageId - 消息ID
 */
export const hideMessage = (groupId, messageId) => {
  try {
    const key = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
    const hiddenMessages = JSON.parse(localStorage.getItem(key) || '{}');
    
    // 如果群聊已被清空，先恢复为数组
    if (hiddenMessages[groupId] === 'ALL_CLEARED') {
      hiddenMessages[groupId] = [];
    }
    
    if (!hiddenMessages[groupId]) {
      hiddenMessages[groupId] = [];
    }
    
    if (Array.isArray(hiddenMessages[groupId]) && !hiddenMessages[groupId].includes(messageId)) {
      hiddenMessages[groupId].push(messageId);
      localStorage.setItem(key, JSON.stringify(hiddenMessages));
    }
  } catch (error) {
    console.error('隐藏消息失败:', error);
  }
};

/**
 * 检查消息是否被隐藏
 * @param {number} groupId - 群聊ID
 * @param {number} messageId - 消息ID
 * @returns {boolean} 如果消息被隐藏返回 true
 */
export const isMessageHidden = (groupId, messageId) => {
  try {
    const key = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
    const hiddenMessages = JSON.parse(localStorage.getItem(key) || '{}');
    return hiddenMessages[groupId]?.includes(messageId) || false;
  } catch (error) {
    console.error('检查消息隐藏状态失败:', error);
    return false;
  }
};

/**
 * 过滤掉隐藏的消息
 * @param {number} groupId - 群聊ID
 * @param {Array} messages - 消息列表
 * @returns {Array} 过滤后的消息列表
 */
export const filterHiddenMessages = (groupId, messages) => {
  if (!groupId || !Array.isArray(messages)) {
    return messages;
  }
  
  try {
    const key = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
    const hiddenMessages = JSON.parse(localStorage.getItem(key) || '{}');
    const groupHidden = hiddenMessages[groupId];
    
    // 如果整个群聊被清空，隐藏所有消息
    if (groupHidden === 'ALL_CLEARED') {
      return [];
    }
    
    // 否则，只隐藏特定ID的消息
    const hiddenIds = Array.isArray(groupHidden) ? groupHidden : [];
    return messages.filter(msg => !hiddenIds.includes(msg.id));
  } catch (error) {
    console.error('过滤隐藏消息失败:', error);
    return messages;
  }
};

/**
 * 清空群聊记录（仅对当前用户）
 * @param {number} groupId - 群聊ID
 * @param {Array<number>} messageIds - 当前所有消息的ID列表，用于隐藏这些消息
 */
export const clearGroupMessages = (groupId, messageIds = []) => {
  try {
    const key = getUserSpecificKey(CLEARED_GROUPS_KEY);
    const clearedGroups = JSON.parse(localStorage.getItem(key) || '[]');
    
    if (!clearedGroups.includes(groupId)) {
      clearedGroups.push(groupId);
      localStorage.setItem(key, JSON.stringify(clearedGroups));
    }
    
    // 隐藏该群聊的所有当前消息
    const hiddenKey = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
    const hiddenMessages = JSON.parse(localStorage.getItem(hiddenKey) || '{}');
    
    // 如果提供了消息ID列表，隐藏这些消息；否则使用ALL_CLEARED标记
    if (Array.isArray(messageIds) && messageIds.length > 0) {
      hiddenMessages[groupId] = messageIds;
    } else {
      hiddenMessages[groupId] = 'ALL_CLEARED';
    }
    
    localStorage.setItem(hiddenKey, JSON.stringify(hiddenMessages));
  } catch (error) {
    console.error('清空群聊记录失败:', error);
  }
};

/**
 * 检查群聊是否被清空
 * @param {number} groupId - 群聊ID
 * @returns {boolean} 如果群聊被清空返回 true
 */
export const isGroupCleared = (groupId) => {
  try {
    const key = getUserSpecificKey(CLEARED_GROUPS_KEY);
    const clearedGroups = JSON.parse(localStorage.getItem(key) || '[]');
    return clearedGroups.includes(groupId);
  } catch (error) {
    console.error('检查群聊清空状态失败:', error);
    return false;
  }
};

/**
 * 恢复群聊记录（取消清空）
 * @param {number} groupId - 群聊ID
 */
export const restoreGroupMessages = (groupId) => {
  try {
    const key = getUserSpecificKey(CLEARED_GROUPS_KEY);
    const clearedGroups = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = clearedGroups.filter(id => id !== groupId);
    localStorage.setItem(key, JSON.stringify(filtered));
    
    // 移除隐藏标记
    const hiddenKey = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
    const hiddenMessages = JSON.parse(localStorage.getItem(hiddenKey) || '{}');
    if (hiddenMessages[groupId] === 'ALL_CLEARED') {
      delete hiddenMessages[groupId];
      localStorage.setItem(hiddenKey, JSON.stringify(hiddenMessages));
    }
  } catch (error) {
    console.error('恢复群聊记录失败:', error);
  }
};

/**
 * 恢复单条消息（取消隐藏）
 * @param {number} groupId - 群聊ID
 * @param {number} messageId - 消息ID
 */
export const restoreMessage = (groupId, messageId) => {
  try {
    const key = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
    const hiddenMessages = JSON.parse(localStorage.getItem(key) || '{}');
    
    if (hiddenMessages[groupId]) {
      if (hiddenMessages[groupId] === 'ALL_CLEARED') {
        // 如果整个群聊被清空，不能单独恢复消息
        return;
      }
      
      const filtered = hiddenMessages[groupId].filter(id => id !== messageId);
      if (filtered.length === 0) {
        delete hiddenMessages[groupId];
      } else {
        hiddenMessages[groupId] = filtered;
      }
      localStorage.setItem(key, JSON.stringify(hiddenMessages));
    }
  } catch (error) {
    console.error('恢复消息失败:', error);
  }
};

