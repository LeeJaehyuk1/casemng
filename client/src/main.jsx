import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import koKR from 'antd/locale/ko_KR'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import App from './App'
import './index.css'

dayjs.locale('ko')

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider locale={koKR} theme={{ token: { colorPrimary: '#1677ff' } }}>
    <App />
  </ConfigProvider>
)
