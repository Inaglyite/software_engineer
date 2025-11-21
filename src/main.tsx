import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Books from './pages/Books'
import NotFound from './pages/NotFound'
import BookDetail from './pages/BookDetail'
import Publish from './pages/Publish'
import Login from './pages/Login'
import DeliveryTasks from './pages/DeliveryTasks'
import PersonalCenter from './pages/PersonalCenter'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'books', element: <Books /> },
      { path: 'books/:bookId', element: <BookDetail /> },
      { path: 'publish', element: <Publish /> },
      { path: 'login', element: <Login /> },
      { path: 'delivery', element: <DeliveryTasks /> },
      { path: 'personal', element: <PersonalCenter /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
