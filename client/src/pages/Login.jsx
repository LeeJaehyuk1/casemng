import React, { useState } from 'react'
import { Form, Input, Button, Typography, Alert } from 'antd'
import { UserOutlined, LockOutlined, SolutionOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'

const { Title, Text } = Typography

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (values) => {
    setLoading(true)
    setError('')
    try {
      const res = await login(values)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #003eb3 0%, #4a0d9e 100%)',
    }}>
      <div style={{
        width: 420,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        padding: '48px 40px 36px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #003eb3 0%, #4a0d9e 100%)',
            marginBottom: 16,
          }}>
            <SolutionOutlined style={{ fontSize: 30, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#1a1a2e' }}>사례관리 시스템</Title>
          <Text type="secondary">로그인하여 시작하세요</Text>
        </div>

        {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} showIcon />}

        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item name="username" label="아이디"
            rules={[{ required: true, message: '아이디를 입력하세요.' }]}>
            <Input prefix={<UserOutlined style={{ color: '#4a0d9e' }} />} placeholder="아이디" size="large"
              style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="password" label="비밀번호"
            rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#4a0d9e' }} />} placeholder="비밀번호" size="large"
              style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary" htmlType="submit" loading={loading} block size="large"
              style={{
                borderRadius: 8, height: 48, fontSize: 16, fontWeight: 600,
                background: 'linear-gradient(90deg, #003eb3 0%, #4a0d9e 100%)',
                border: 'none',
              }}
            >
              로그인
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12 }}>
          초기 계정: admin / admin1234
        </div>
      </div>
    </div>
  )
}
