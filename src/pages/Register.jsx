import { useState } from 'react';
import { Form, Input, Button, Checkbox, Space } from 'antd';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveUserInfo } from '../utils/userStorage';
import './Register.css';

const Register = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const navigate = useNavigate();
  const handleSendCode = async () => {
    try {
      const email = form.getFieldValue('email');
      if (!email) {
        return;
      }
      setCodeLoading(true);
      // 这里添加发送验证码的逻辑
      setTimeout(() => {
        setCodeLoading(false);
      }, 1000);
    } catch (error) {
      setCodeLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    console.log('Form values:', values);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          phone: values.phone,
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('注册成功:', data);
        // 保存用户信息到 localStorage
        // 假设 API 返回的数据结构包含 username、email 和 id
        // 如果 API 返回的字段不同，请根据实际情况调整
        const email = data.email || data.user?.email || values.email;
        const userInfo = {
          username: data.username || data.user?.username || values.username,
          email: email,
          phone: data.phone || data.user?.phone || values.phone,
          name: email, // 姓名使用邮箱
          id: data.id || data.user?.id || data.user_id,
          userId: data.id || data.user?.id || data.user_id, // 用户ID
          ...data.user, // 保存其他用户信息
        };
        saveUserInfo(userInfo);
        // 注册成功后跳转到聊天页面
        navigate('/chat');
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

  const onCancel = () => {
    form.resetFields();
  };

  const handleSwitchToLogin = () => {
    navigate('/login');
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
            <h1 className="login-title">请提供以下详细信息。</h1>
            <Button 
              type="link" 
              onClick={handleSwitchToLogin}
              className="switch-button"
            >
              切换到登录
            </Button>
          </div>
          
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="login-form"
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, message: '用户名至少2个字符' },
                { max: 20, message: '用户名最多20个字符' }
              ]}
            >
              <Input
                placeholder="请输入用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="手机号"
              name="phone"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式' }
              ]}
            >
              <Input
                placeholder="请输入手机号"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="电子邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入电子邮箱' },
                { type: 'email', message: '请输入正确的邮箱格式' }
              ]}
            >
              <Input
                placeholder="请输入电子邮箱"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="验证码"
              name="verificationCode"
              rules={[
                { required: true, message: '请输入验证码' }
              ]}
            >
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="请输入验证码"
                  size="large"
                  style={{ flex: 1 }}
                />
                <Button
                  type="default"
                  size="large"
                  icon={<Mail size={16} />}
                  onClick={handleSendCode}
                  loading={codeLoading}
                >
                  发送验证码
                </Button>
              </Space.Compact>
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

            <Form.Item
              label="确认密码"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder="确认密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="条款及细则"
              name="terms"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value ? Promise.resolve() : Promise.reject(new Error('请阅读并接受使用条款和隐私政策')),
                },
              ]}
            >
              <Checkbox>
                我已阅读并接受使用条款和隐私政策
              </Checkbox>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  size="large"
                  onClick={onCancel}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={loading}
                >
                  注册
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Register;

