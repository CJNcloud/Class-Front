import { Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import CreateGroupChat from './pages/CreateGroupChat';
import JoinGroupChat from './pages/JoinGroupChat';
import EditGroupChat from './pages/EditGroupChat';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import GroupMemberManagement from './pages/GroupMemberManagement';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/create-group" element={<CreateGroupChat />} />
      <Route path="/join-group" element={<JoinGroupChat />} />
      <Route path="/edit-group/:groupId" element={<EditGroupChat />} />
      <Route path="/group-members/:groupId" element={<GroupMemberManagement />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}

export default App;
