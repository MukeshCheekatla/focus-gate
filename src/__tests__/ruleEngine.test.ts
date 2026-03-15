import { startRuleEngine, stopRuleEngine, resetDailyBlocks } from '../engine/ruleEngine';
import { getRules, saveRules, updateRule } from '../store/rules';
import { getSchedules } from '../store/schedules';
import { getAppMinutesToday, refreshTodayUsage } from '../modules/usageStats';
import { blockApp, unblockApp, blockApps, unblockApps } from '../api/nextdns';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({ set: jest.fn(), getString: jest.fn(() => null) })),
}));

jest.mock('../api/nextdns', () => ({
  blockApp: jest.fn(),
  unblockApp: jest.fn(),
  blockApps: jest.fn(),
  unblockApps: jest.fn(),
}));

jest.mock('../modules/usageStats', () => ({
  getAppMinutesToday: jest.fn(() => 0),
  refreshTodayUsage: jest.fn(),
}));

jest.mock('../store/rules', () => ({
  getRules: jest.fn(() => []),
  saveRules: jest.fn(),
  updateRule: jest.fn(),
}));

jest.mock('../store/schedules', () => ({
  getSchedules: jest.fn(() => []),
}));

const mockGetRules = getRules as jest.Mock;
const mockGetSchedules = getSchedules as jest.Mock;
const mockGetAppMinutesToday = getAppMinutesToday as jest.Mock;
const mockUnblockApps = unblockApps as jest.Mock;
const mockBlockApp = blockApp as jest.Mock;
const mockUpdateRule = updateRule as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  stopRuleEngine();
  jest.useRealTimers();
});

describe('RuleEngine', () => {
  describe('startRuleEngine / stopRuleEngine', () => {
    it('starts the engine interval', () => {
      startRuleEngine();
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('is idempotent — calling start twice does not create two intervals', () => {
      startRuleEngine();
      const countAfterFirst = jest.getTimerCount();
      startRuleEngine();
      expect(jest.getTimerCount()).toBe(countAfterFirst);
    });

    it('stopRuleEngine clears the interval', () => {
      startRuleEngine();
      stopRuleEngine();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('resetDailyBlocks', () => {
    it('calls unblockApps with names of all BLOCKED rules', async () => {
      mockGetRules.mockReturnValue([
        { appName: 'Instagram', mode: 'BLOCK', domains: ['instagram.com'] },
        { appName: 'YouTube', mode: 'ALLOW', domains: ['youtube.com'] },
        { appName: 'Twitter', mode: 'BLOCK', domains: ['twitter.com'] },
      ]);

      await resetDailyBlocks();

      expect(mockUnblockApps).toHaveBeenCalledWith(
        expect.arrayContaining(['Instagram', 'Twitter'])
      );
    });

    it('does not call unblockApps when no rules are BLOCKED', async () => {
      mockGetRules.mockReturnValue([
        { appName: 'Instagram', mode: 'ALLOW', domains: ['instagram.com'] },
      ]);

      await resetDailyBlocks();

      expect(mockUnblockApps).not.toHaveBeenCalled();
    });
  });

  describe('runChecks — limit enforcement', () => {
    it('blocks an app when usage exceeds the daily limit', async () => {
      mockGetRules.mockReturnValue([
        { appName: 'Instagram', mode: 'LIMIT', limitMinutes: 30, domains: ['instagram.com'] },
      ]);
      mockGetAppMinutesToday.mockReturnValue(45);

      startRuleEngine();
      jest.advanceTimersByTime(60000);
      await Promise.resolve();

      expect(mockBlockApp).toHaveBeenCalledWith('Instagram');
    });

    it('does NOT block an app that is under the limit', async () => {
      mockGetRules.mockReturnValue([
        { appName: 'YouTube', mode: 'LIMIT', limitMinutes: 60, domains: ['youtube.com'] },
      ]);
      mockGetAppMinutesToday.mockReturnValue(20);

      startRuleEngine();
      jest.advanceTimersByTime(60000);
      await Promise.resolve();

      expect(mockBlockApp).not.toHaveBeenCalledWith('YouTube');
    });
  });

  describe('checkSchedules', () => {
    it('returns without error when no schedules exist', async () => {
      mockGetSchedules.mockReturnValue([]);
      startRuleEngine();
      expect(() => jest.advanceTimersByTime(60000)).not.toThrow();
    });
  });
});
