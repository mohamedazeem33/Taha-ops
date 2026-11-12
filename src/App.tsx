import { useAuth } from '@/contexts/AuthContext';
import { AudioProvider } from '@/contexts/AudioContext';
import { useAdminRoute, useEmployeeRoute } from '@/lib/adminRoute';
import { AdminConfirmationsPage } from '@/pages/AdminConfirmationsPage';
import { AdminHomePage } from '@/pages/AdminHomePage';
import { AdminLeaderboardPage } from '@/pages/AdminLeaderboardPage';
import { AdminPlanPage } from '@/pages/AdminPlanPage';
import { AdminRewardsPage } from '@/pages/AdminRewardsPage';
import { AdminReportsPage } from '@/pages/AdminReportsPage';
import { AdminOverviewTasksPage } from '@/pages/AdminOverviewTasksPage';
import { AdminTimeRequestsPage } from '@/pages/AdminTimeRequestsPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { FeedbackPage } from '@/pages/FeedbackPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { MyProgressPage } from '@/pages/MyProgressPage';
import { RewardsPage } from '@/pages/RewardsPage';
import { TodayPage } from '@/pages/TodayPage';
import { Spinner } from '@/components/ui';

export default function App() {
  const { account, loading } = useAuth();
  const adminRoute = useAdminRoute();
  const employeeRoute = useEmployeeRoute();

  if (loading) return <Spinner label="Loading Teamboard" />;
  if (!account) return <LoginPage />;

  const renderContent = () => {
    if (account.profile.must_change_password) return <ChangePasswordPage />;

    if (account.role === 'admin') {
      switch (adminRoute) {
        case 'plan':
          return <AdminPlanPage />;
        case 'confirmations':
          return <AdminConfirmationsPage />;
        case 'time-requests':
          return <AdminTimeRequestsPage />;
        case 'leaderboard':
          return <AdminLeaderboardPage />;
        case 'rewards':
          return <AdminRewardsPage />;
        case 'reports':
          return <AdminReportsPage />;
        case 'overview-tasks':
          return <AdminOverviewTasksPage />;
        default:
          return <AdminHomePage />;
      }
    }

    switch (employeeRoute) {
      case 'progress':
        return <MyProgressPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'rewards':
        return <RewardsPage />;
      case 'feedback':
        return <FeedbackPage />;
      default:
        return <TodayPage />;
    }
  };

  return <AudioProvider>{renderContent()}</AudioProvider>;
}
