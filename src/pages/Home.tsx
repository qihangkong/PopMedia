import HeaderBar from '../components/HeaderBar'

export default function Home() {
  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content">
        <h1>首页</h1>
        <p>欢迎使用 PopMedia</p>
      </div>
    </div>
  )
}
