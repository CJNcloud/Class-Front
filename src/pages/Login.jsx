import { useState } from 'react';
import { Form, Input, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { saveUserInfo } from '../utils/userStorage';
import './Login.css';

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    console.log('Login values:', values);
    
    try {
      // 这里添加登录API调用
      const response = await fetch('http://127.0.0.1:8000/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_identifier: values.emailOrPhone,
          password: values.password,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('登录成功:', data);
        // 保存用户信息到 localStorage
        // 假设 API 返回的数据结构包含 username、email 和 id
        // 如果 API 返回的字段不同，请根据实际情况调整
        const email = data.email || data.user?.email || values.emailOrPhone;
        const username = data.username || data.user?.username || values.emailOrPhone;
        const role = data.role || data.user?.role || 'user'; // 获取角色信息
        const token = data.token || data.access_token || data.user?.token || data.user?.access_token; // 获取token
        const userInfo = {
          username: username,
          email: email,
          name: email, // 姓名使用邮箱
          id: data.id || data.user?.id || data.user_id,
          userId: data.id || data.user?.id || data.user_id, // 用户ID
          role: role, // 保存角色信息
          token: token, // 保存token用于API认证
          ...data.user, // 保存其他用户信息
        };
        saveUserInfo(userInfo);
        // 根据角色跳转：管理员跳转到管理页面，普通用户跳转到聊天页面
        if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/chat');
        }
      } else {
        console.error('登录失败:', data);
        // 这里可以显示错误消息
      }
    } catch (error) {
      console.error('请求错误:', error);
      // 这里可以显示错误消息
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToRegister = () => {
    navigate('/register');
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleSMSLogin = () => {
    // 处理短信验证码登录逻辑
    console.log('短信验证码登录');
  };

  return (
    <div className="login-container">
      <div className="login-left">
        {/* 左侧空白区域 */}
      </div>
      <div className="login-divider"></div>
      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="login-header">
            <h1 className="login-title">使用现有账户登录</h1>
            <Button 
              type="link" 
              onClick={handleSwitchToRegister}
              className="switch-button"
            >
              切换到注册
            </Button>
          </div>
          
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="login-form"
          >
            <Form.Item
              label="用户名/电子邮件地址/手机号"
              name="emailOrPhone"
              rules={[
                { required: true, message: '请输入用户名、电子邮件地址或手机号' },
                {
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.reject(new Error('请输入用户名、电子邮件地址或手机号'));
                    }
                    // 验证是邮箱格式、手机号格式或用户名格式
                    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                    const isPhone = /^1[3-9]\d{9}$/.test(value);
                    // 用户名格式：3-20个字符，可以包含字母、数字、下划线，不能以数字开头
                    const isUsername = /^[a-zA-Z_][a-zA-Z0-9_]{2,19}$/.test(value);
                    if (isEmail || isPhone || isUsername) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('请输入正确的用户名、邮箱或手机号格式'));
                  },
                },
              ]}
            >
              <Input
                placeholder="请输入用户名、邮箱或手机号"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' }
              ]}
            >
              <Input.Password
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={loading}
                block
                className="login-button"
              >
                登录
              </Button>
            </Form.Item>

            <Form.Item className="login-links">
              <div className="links-container">
                <Button 
                  type="link" 
                  onClick={handleForgotPassword}
                  className="link-button"
                >
                  忘记密码?
                </Button>
                <Button 
                  type="link" 
                  onClick={handleSMSLogin}
                  className="link-button"
                >
                  短信验证码登录
                </Button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;

