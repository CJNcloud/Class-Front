import { X, Plus, Users } from 'lucide-react';
import './GroupActionModal.css';

const GroupActionModal = ({ isOpen, onClose, onCreateGroup, onJoinGroup }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">选择操作</h2>
          <button className="modal-close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <button className="action-button" onClick={onCreateGroup}>
            <div className="action-icon create-icon">
              <Plus size={24} />
            </div>
            <div className="action-content">
              <div className="action-title">创建群聊</div>
              <div className="action-description">创建一个新的群聊</div>
            </div>
          </button>
          <button className="action-button" onClick={onJoinGroup}>
            <div className="action-icon join-icon">
              <Users size={24} />
            </div>
            <div className="action-content">
              <div className="action-title">加入群聊</div>
              <div className="action-description">通过群聊ID加入群聊</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupActionModal;

