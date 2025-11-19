/**
 * GovernmentPMDashboard Component Tests
 * Tests for Government PM dashboard component with API integration
 * Story: 1.5 - Roadmap UI Complete Implementation
 * AC 26: Frontend Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GovernmentPMDashboard } from '../GovernmentPMDashboard';
import { dashboardApi } from '@/services/dashboardApi';

// Mock the dashboard API
vi.mock('@/services/dashboardApi', () => ({
  dashboardApi: {
    getGovernmentPMDashboard: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  SettingsIcon: () => <div>SettingsIcon</div>,
  ListChecksIcon: () => <div>ListChecksIcon</div>,
  LayoutDashboardIcon: () => <div>LayoutDashboardIcon</div>,
  MapIcon: () => <div>MapIcon</div>,
  PlusIcon: () => <div>PlusIcon</div>,
  UsersIcon: () => <div>UsersIcon</div>,
  LoaderIcon: () => <div>LoaderIcon</div>,
}));

// Mock child components
vi.mock('../widgets/RoadmapWidget', () => ({
  RoadmapWidget: ({ title, children }: any) => (
    <div data-testid="roadmap-widget">
      <h3>{title}</h3>
      {children}
    </div>
  ),
}));

vi.mock('../widgets/MetricCard', () => ({
  MetricCard: ({ value, label }: any) => (
    <div data-testid="metric-card">
      <span>{value}</span>
      <span>{label}</span>
    </div>
  ),
}));

vi.mock('../widgets/ProcessFlowStep', () => ({
  ProcessFlow: ({ steps }: any) => (
    <div data-testid="process-flow">
      {steps.map((step: any, idx: number) => (
        <div key={idx}>{step.title}</div>
      ))}
    </div>
  ),
}));

vi.mock('../widgets/TimelineItem', () => ({
  Timeline: ({ items }: any) => (
    <div data-testid="timeline">
      {items.map((item: any, idx: number) => (
        <div key={idx}>{item.title}</div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('GovernmentPMDashboard', () => {
  const mockDashboardData = {
    metrics: {
      activeTransitions: 12,
      pendingReviews: 8,
      knowledgeArticles: 156,
      onTrackRate: 87,
    },
    platformSetup: [
      { title: 'Setup Users', status: 'complete' as const },
      { title: 'Configure System', status: 'complete' as const },
      { title: 'Import Data', status: 'in-progress' as const },
      { title: 'Train Users', status: 'not-started' as const },
      { title: 'Go Live', status: 'not-started' as const },
    ],
    curationQueue: [
      {
        title: 'Network Topology Diagrams',
        submittedBy: 'Henry Hou',
        submittedAt: '2025-10-16T10:30:00Z',
        status: 'pending',
      },
    ],
    transitionRoadmap: {
      contracts: [
        { name: 'Contract A', progress: 75, status: 'on-track' as const },
        { name: 'Contract B', progress: 45, status: 'at-risk' as const },
      ],
      personnel: [
        { role: 'Network Engineer', count: 3, status: 'training' as const },
        { role: 'Security Analyst', count: 2, status: 'ready' as const },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching data', () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
      expect(screen.getByText('LoaderIcon')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should render dashboard with all metrics when data loads successfully', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(mockDashboardData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Government Program Manager')).toBeInTheDocument();
      });

      // Check metrics are displayed
      const metricCards = screen.getAllByTestId('metric-card');
      expect(metricCards).toHaveLength(4);

      expect(screen.getByText('12')).toBeInTheDocument(); // Active Transitions
      expect(screen.getByText('8')).toBeInTheDocument(); // Pending Reviews
      expect(screen.getByText('156')).toBeInTheDocument(); // Knowledge Articles
      expect(screen.getByText('87%')).toBeInTheDocument(); // On-Track Rate
    });

    it('should render platform setup steps', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(mockDashboardData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Platform Setup')).toBeInTheDocument();
      });

      expect(screen.getByText('Setup Users')).toBeInTheDocument();
      expect(screen.getByText('Configure System')).toBeInTheDocument();
      expect(screen.getByText('Import Data')).toBeInTheDocument();
      expect(screen.getByText('Train Users')).toBeInTheDocument();
      expect(screen.getByText('Go Live')).toBeInTheDocument();
    });

    it('should render curation queue items', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(mockDashboardData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Knowledge Curation Queue')).toBeInTheDocument();
      });

      expect(screen.getByText('Network Topology Diagrams')).toBeInTheDocument();
    });

    it('should render transition roadmap with contracts and personnel', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(mockDashboardData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Transition Roadmap Overview')).toBeInTheDocument();
      });

      expect(screen.getByText('Contract A')).toBeInTheDocument();
      expect(screen.getByText('Contract B')).toBeInTheDocument();
      expect(screen.getByText('Network Engineer')).toBeInTheDocument();
      expect(screen.getByText('Security Analyst')).toBeInTheDocument();
    });

    it('should render "Initiate New Transition" button', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(mockDashboardData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Initiate New Transition')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when API call fails', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockRejectedValue(
        new Error('Network error')
      );

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard data. Please try again.')).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should allow user to retry after error', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockDashboardData);

      // Act
      render(<GovernmentPMDashboard />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('Retry');
      retryButton.click();

      // Assert - Dashboard should load successfully after retry
      await waitFor(() => {
        expect(screen.getByText('Government Program Manager')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State Handling', () => {
    it('should handle empty contracts array gracefully', async () => {
      // Arrange
      const emptyContractsData = {
        ...mockDashboardData,
        transitionRoadmap: {
          contracts: [],
          personnel: mockDashboardData.transitionRoadmap.personnel,
        },
      };

      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(emptyContractsData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Transition Roadmap Overview')).toBeInTheDocument();
      });

      expect(screen.getByText('No active contract transitions')).toBeInTheDocument();
    });

    it('should handle empty personnel array gracefully', async () => {
      // Arrange
      const emptyPersonnelData = {
        ...mockDashboardData,
        transitionRoadmap: {
          contracts: mockDashboardData.transitionRoadmap.contracts,
          personnel: [],
        },
      };

      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(emptyPersonnelData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Transition Roadmap Overview')).toBeInTheDocument();
      });

      expect(screen.getByText('No personnel data available')).toBeInTheDocument();
    });

    it('should handle null/undefined transitionRoadmap gracefully', async () => {
      // Arrange
      const nullRoadmapData = {
        ...mockDashboardData,
        transitionRoadmap: null as any,
      };

      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(nullRoadmapData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert - Should not crash
      await waitFor(() => {
        expect(screen.getByText('Government Program Manager')).toBeInTheDocument();
      });

      expect(screen.getByText('No active contract transitions')).toBeInTheDocument();
      expect(screen.getByText('No personnel data available')).toBeInTheDocument();
    });

    it('should handle empty platform setup array', async () => {
      // Arrange
      const emptySetupData = {
        ...mockDashboardData,
        platformSetup: [],
      };

      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(emptySetupData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert - Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Platform Setup')).toBeInTheDocument();
      });
    });

    it('should handle empty curation queue', async () => {
      // Arrange
      const emptyQueueData = {
        ...mockDashboardData,
        curationQueue: [],
      };

      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(emptyQueueData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert - Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Knowledge Curation Queue')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch dashboard data on mount', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(mockDashboardData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        expect(dashboardApi.getGovernmentPMDashboard).toHaveBeenCalledTimes(1);
      });
    });

    it('should not fetch data multiple times on re-renders', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(mockDashboardData);

      // Act
      const { rerender } = render(<GovernmentPMDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Government Program Manager')).toBeInTheDocument();
      });

      // Re-render component
      rerender(<GovernmentPMDashboard />);

      // Assert - Should only be called once
      expect(dashboardApi.getGovernmentPMDashboard).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(mockDashboardData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        const heading = screen.getByText('Government Program Manager');
        expect(heading).toBeInTheDocument();
        expect(heading.tagName).toBe('H1');
      });
    });

    it('should display descriptive text for user role', async () => {
      // Arrange
      vi.mocked(dashboardApi.getGovernmentPMDashboard).mockResolvedValue(mockDashboardData);

      // Act
      render(<GovernmentPMDashboard />);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText(/Transition oversight, stakeholder coordination/i)
        ).toBeInTheDocument();
      });
    });
  });
});
