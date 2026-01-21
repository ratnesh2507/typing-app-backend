# Changelog

All notable changes to Rapid Type Challenge will be documented here.

## [1.1.0] - 2026-01-21

### Added

- Users table now auto-updates whenever a new racer signs in.
- Leaderboard views updated to track `clerk_id` instead of `user_id`.
- Race page shows a small instruction above the typing area:
  - **Red = correct**
  - **Blue = incorrect**
- Release notes modal for Dashboard to inform users about new updates.
- LocalStorage feature to show release notes only once per version.

### Fixed

- Backend insertion into `users` table not working correctly.
- Race participants DB insertion edge cases fixed.
- Minor UI improvements in Dashboard and Race pages.

### Notes

- Versioning of release notes modal ensures users aren't repeatedly notified of the same update.
- Leaderboard consistency improved by switching to `clerk_id` references.
