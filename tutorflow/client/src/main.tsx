import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { Onboarding } from './pages/auth/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Search } from './pages/Search'
import { TutorProfile } from './pages/TutorProfile'
import { Checkout } from './pages/Checkout'
import { VideoRoom } from './pages/VideoRoom'
import { Review } from './pages/Review'
import { TutorStats } from './pages/TutorStats'
import { AdminTutors } from './pages/AdminTutors'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminDisputes } from './pages/AdminDisputes'
import { AdminUsers } from './pages/AdminUsers'
import { Notifications } from './pages/Notifications'
import { NotificationSettings } from './pages/NotificationSettings'
import { ProtectedRoute } from './components/ProtectedRoute'
import './index.css'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Search />,
          },
          {
            path: 'search',
            element: <Search />,
          },
          {
            path: 'tutors/:id',
            element: <TutorProfile />,
          },
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'onboarding',
            element: <Onboarding />,
          },
          {
            path: 'checkout/:sessionId',
            element: <Checkout />,
          },
          {
            path: 'session/:id/room',
            element: <VideoRoom />,
          },
          {
            path: 'review/:sessionId',
            element: <Review />,
          },
          {
            path: 'dashboard/tutor/stats',
            element: <TutorStats />,
          },
          {
            path: 'admin/tutors',
            element: <AdminTutors />,
          },
          {
            path: 'admin/dashboard',
            element: <AdminDashboard />,
          },
          {
            path: 'admin/disputes',
            element: <AdminDisputes />,
          },
          {
            path: 'admin/users',
            element: <AdminUsers />,
          },
          {
            path: 'notifications',
            element: <Notifications />,
          },
          {
            path: 'settings/notifications',
            element: <NotificationSettings />,
          }
        ]
      }
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
