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
    // 检查群聊是否被清空
    const isChatCleared = isGroupCleared(groupId);
    
    if (!isChatCleared) {
      // 如果群聊未被清空，只根据hiddenMessages中的ID过滤
      const key = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
      const hiddenMessages = JSON.parse(localStorage.getItem(key) || '{}');
      const hiddenIds = Array.isArray(hiddenMessages[groupId]) ? hiddenMessages[groupId] : [];
      return messages.filter(msg => !hiddenIds.includes(msg.id));
    } else {
      // 如果群聊已被清空，需要考虑：
      // 1. 获取清空时间戳
      const clearTimestamp = getClearTimestamp(groupId);
      
      // 2. 获取已存储的隐藏消息ID（清空操作时的消息）
      const key = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
      const hiddenMessages = JSON.parse(localStorage.getItem(key) || '{}');
      const hiddenIds = Array.isArray(hiddenMessages[groupId]) ? hiddenMessages[groupId] : [];
      
      // 3. 过滤消息：
      // - 消息ID在hiddenIds中的（清空操作时存在的消息）隐藏
      // - 消息发送时间在clearTimestamp之前的隐藏
      // - 其他消息（清空后新发送的）显示
      return messages.filter(msg => {
        // 如果消息ID在隐藏列表中，隐藏它
        if (hiddenIds.includes(msg.id)) {
          return false;
        }
        
        // 如果有清空时间戳，且消息发送时间在清空时间之前，隐藏它
        if (clearTimestamp && msg.sent_at && new Date(msg.sent_at) < new Date(clearTimestamp)) {
          return false;
        }
        
        // 其他消息显示
        return true;
      });
    }
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
    // 使用clearedGroups作为标记，表示群聊已被清空
    const clearedKey = getUserSpecificKey(CLEARED_GROUPS_KEY);
    const clearedGroups = JSON.parse(localStorage.getItem(clearedKey) || '[]');
    
    if (!clearedGroups.includes(groupId)) {
      clearedGroups.push(groupId);
      localStorage.setItem(clearedKey, JSON.stringify(clearedGroups));
    }
    
    // 同时存储当前可见的消息ID，用于隐藏这些特定消息
    const hiddenKey = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
    const hiddenMessages = JSON.parse(localStorage.getItem(hiddenKey) || '{}');
    
    // 存储当前所有消息的ID，用于隐藏这些历史消息
    hiddenMessages[groupId] = Array.isArray(messageIds) ? messageIds : [];
    
    // 存储清空操作的时间戳，用于区分清空前后的消息
    const timestampKey = getUserSpecificKey('clearTimestamps');
    const clearTimestamps = JSON.parse(localStorage.getItem(timestampKey) || '{}');
    clearTimestamps[groupId] = new Date().toISOString();
    
    localStorage.setItem(hiddenKey, JSON.stringify(hiddenMessages));
    localStorage.setItem(timestampKey, JSON.stringify(clearTimestamps));
  } catch (error) {
    console.error('清空群聊记录失败:', error);
  }
};

/**
 * 获取群聊清空时间戳
 * @param {number} groupId - 群聊ID
 * @returns {string|null} 清空时间戳，如果群聊未被清空则返回null
 */
export const getClearTimestamp = (groupId) => {
  try {
    const key = getUserSpecificKey('clearTimestamps');
    const clearTimestamps = JSON.parse(localStorage.getItem(key) || '{}');
    return clearTimestamps[groupId] || null;
  } catch (error) {
    console.error('获取清空时间戳失败:', error);
    return null;
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
    
    // 移除隐藏标记，直接删除该群聊的所有隐藏消息记录
    const hiddenKey = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
    const hiddenMessages = JSON.parse(localStorage.getItem(hiddenKey) || '{}');
    if (hiddenMessages[groupId]) {
      delete hiddenMessages[groupId];
      localStorage.setItem(hiddenKey, JSON.stringify(hiddenMessages));
    }
    
    // 移除清空时间戳
    const timestampKey = getUserSpecificKey('clearTimestamps');
    const clearTimestamps = JSON.parse(localStorage.getItem(timestampKey) || '{}');
    if (clearTimestamps[groupId]) {
      delete clearTimestamps[groupId];
      localStorage.setItem(timestampKey, JSON.stringify(clearTimestamps));
    }
  } catch (error) {
    console.error('恢复群聊记录失败:', error);
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
// export const restoreGroupMessages = (groupId) => {
//   try {
//     const key = getUserSpecificKey(CLEARED_GROUPS_KEY);
//     const clearedGroups = JSON.parse(localStorage.getItem(key) || '[]');
//     const filtered = clearedGroups.filter(id => id !== groupId);
//     localStorage.setItem(key, JSON.stringify(filtered));
    
//     // 移除隐藏标记，直接删除该群聊的所有隐藏消息记录
//     const hiddenKey = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
//     const hiddenMessages = JSON.parse(localStorage.getItem(hiddenKey) || '{}');
//     if (hiddenMessages[groupId]) {
//       delete hiddenMessages[groupId];
//       localStorage.setItem(hiddenKey, JSON.stringify(hiddenMessages));
//     }
//   } catch (error) {
//     console.error('恢复群聊记录失败:', error);
//   }
// };

/**
 * 恢复单条消息（取消隐藏）
 * @param {number} groupId - 群聊ID
 * @param {number} messageId - 消息ID
 */
export const restoreMessage = (groupId, messageId) => {
  try {
    const key = getUserSpecificKey(HIDDEN_MESSAGES_KEY);
    const hiddenMessages = JSON.parse(localStorage.getItem(key) || '{}');
    
    if (Array.isArray(hiddenMessages[groupId])) {
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

