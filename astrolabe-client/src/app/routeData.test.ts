import { describe, it, expect } from 'vitest';
import { getMatchingRoute, type RouteData } from './routeData';

describe('getMatchingRoute', () => {
  const testRoutesWithoutWildcard: Record<string, RouteData> = {
    home: { label: 'Home' },
    About: { label: 'About Us' },
    CONTACT: { label: 'Contact' },
    teas: {
      label: 'Teas',
      children: {
        green: { label: 'Peppermint' },
        PURPLE: { label: 'Lady Gray' },
        Blue: { label: 'Blue' }
      }
    },
    admin: {
      label: 'Admin',
      children: {
        Users: {
          label: 'Users',
          children: {
            profile: { label: 'Profile' }
          }
        }
      }
    },
  };

  const testRoutes = {
    ...testRoutesWithoutWildcard,
    '*': { label: 'Rooibos' }
  };

  it('should match exact case routes', () => {
    const result = getMatchingRoute(testRoutes, ['home']);
    expect(result).toEqual({ label: 'Home' });
  });

  it('should match routes case insensitively - lowercase to uppercase', () => {
    const result = getMatchingRoute(testRoutes, ['about']);
    expect(result).toEqual({ label: 'About Us' });
  });

  it('should match routes case insensitively - uppercase to lowercase', () => {
    const result = getMatchingRoute(testRoutes, ['contact']);
    expect(result).toEqual({ label: 'Contact' });
  });

  it('should match routes case insensitively - mixed case', () => {
    const result = getMatchingRoute(testRoutes, ['TEAS']);
    expect(result).toEqual({
      label: 'Teas',
      children: {
        green: { label: 'Peppermint' },
        PURPLE: { label: 'Lady Gray' },
        Blue: { label: 'Blue' }
      }
    });
  });

  it('should match nested routes case insensitively', () => {
    const result = getMatchingRoute(testRoutes, ['TEAS', 'green']);
    expect(result).toEqual({ label: 'Peppermint' });
  });

  it('should match deeply nested routes case insensitively', () => {
    const result = getMatchingRoute(testRoutes, ['admin', 'users', 'PROFILE']);
    expect(result).toEqual({ label: 'Profile' });
  });

  it('should match mixed case in nested routes', () => {
    const result = getMatchingRoute(testRoutes, ['Teas', 'purple']);
    expect(result).toEqual({ label: 'Lady Gray' });
  });

  it('should return undefined for non-existent routes when there is no wildcard', () => {
    const result = getMatchingRoute(testRoutesWithoutWildcard, ['nonexistent']);
    expect(result).toBeUndefined();
  });

  it('should return wildcard for non-existent routes when there is a wildcard', () => {
    const result = getMatchingRoute(testRoutes, ['unknown-route']);
    expect(result).toEqual({ label: 'Rooibos' });
  });

  it('should fall back to wildcard when exact match not found', () => {
    const result = getMatchingRoute(testRoutes, ['unknown-route']);
    expect(result).toEqual({ label: 'Rooibos' });
  });

  it('should handle empty segments array', () => {
    const result = getMatchingRoute(testRoutes, []);
    // @ts-expect-error
    expect(result).toEqual(testRoutes['']);
  });

  it('should handle segmentOffset parameter', () => {
    const result = getMatchingRoute(testRoutes, ['skip', 'TEAS'], 1);
    expect(result).toEqual({
      label: 'Teas',
      children: {
        green: { label: 'Peppermint' },
        PURPLE: { label: 'Lady Gray' },
        Blue: { label: 'Blue' }
      }
    });
  });

  it('should return undefined when path goes beyond available children', () => {
    const result = getMatchingRoute(testRoutes, ['home', 'nonexistent']);
    expect(result).toBeUndefined();
  });

  it('should match case insensitive routes with special characters', () => {
    const routesWithSpecial: Record<string, RouteData> = {
      'user-profile': { label: 'User Profile' },
      'api_v2': { label: 'API v2' }
    };

    const result1 = getMatchingRoute(routesWithSpecial, ['USER-PROFILE']);
    expect(result1).toEqual({ label: 'User Profile' });

    const result2 = getMatchingRoute(routesWithSpecial, ['API_V2']);
    expect(result2).toEqual({ label: 'API v2' });
  });
});